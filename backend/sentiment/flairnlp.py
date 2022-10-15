import logging
import re
from typing import List, Iterable

import flair
import pandas as pd
import segtok.tokenizer

from backend import data_models
from backend.sentiment import domain_vocab

logger = logging.getLogger(__name__)

cols = data_models.Cols


def sentiment_results_dataframe(texts: Iterable[str]):
    # filter texts for deduping
    texts_filtered = [' '.join(tokenizer(s)) for s in texts]

    df_in = pd.DataFrame({cols.text: texts_filtered})

    # dedup
    no_dups = df_in.drop_duplicates().copy()

    # replace common important OOV words
    replaced_vocab_texts = domain_vocab.substitute_words(no_dups[cols.text])

    # get scores and final texts
    scores, processed_texts = model.negativity_scores(replaced_vocab_texts)
    no_dups.loc[:, cols.score] = scores
    no_dups.loc[:, cols.processed_text] = processed_texts

    # merge
    df_out = pd.merge(df_in, no_dups, on='text', how='left')

    # log
    md_table = (df_out[[cols.score, cols.processed_text]]
                .sort_values(cols.score)
                .reset_index().to_markdown(floatfmt='.3f'))
    logger.info(f"inference results:\n{md_table}")
    return df_out


def tokenizer(text):
    return segtok.tokenizer.symbol_tokenizer(
        ' '.join(segtok.tokenizer.word_tokenizer(text)))


class RNNModel:
    flair_model_name = 'sentiment-fast'

    _model: flair.models.TextClassifier = None
    _vocab = set()
    _max_pred_tokens = 20
    _cache = {}
    _max_cache_size = 1000000

    @property
    def model(self):
        if self._model is None:
            self.load()
        return self._model

    def load(self):
        self._model = flair.models.TextClassifier.load(self.flair_model_name)

    @staticmethod
    def _negativity_score(sentence: flair.data.Sentence):
        if sentence.to_plain_string() == '':
            return 0
        elif sentence.labels[0].value == 'NEGATIVE':
            return 0.5 + 0.5 * sentence.labels[0].score
        else:
            return 0.5 - 0.5 * sentence.labels[0].score

    def _texts_prep(self, str_list: Iterable[str]) -> List[flair.data.Sentence]:
        sents = [flair.data.Sentence(s, use_tokenizer=tokenizer)
                 for s in str_list]
        self._sanitize_oov(sents)
        self._truncate_long_texts(sents)
        return sents

    def _inference_into_cache(self, new_sentences: List[flair.data.Sentence]):
        # predict
        logger.info(f'inferencing for {len(new_sentences)} sentences')
        self.model.predict(new_sentences, mini_batch_size=1024, verbose=True)
        new_scores = [self._negativity_score(s) for s in new_sentences]

        # update cache
        new_texts = [s.to_plain_string() for s in new_sentences]
        self._check_cache_size()
        self._cache.update({k: v for k, v in zip(new_texts, new_scores)})

    def _check_cache_size(self):
        if len(self._cache) > self._max_cache_size:
            # decimate oldest keys
            for key in list(self._cache.keys())[:(self._max_cache_size // 10)]:
                del self._cache[key]

    def negativity_scores(self, str_list: Iterable[str]):
        sents = self._texts_prep(str_list)
        texts = [s.to_plain_string() for s in sents]

        # update cache
        new_sents = [sent for sent, text in zip(sents, texts)
                     if text not in self._cache]
        self._inference_into_cache(new_sents)

        # get from cache
        scores = [self._cache[text] for text in texts]

        return scores, texts

    def _extract_embedding_vocab(self):
        return (self.model.document_embeddings
                .embeddings.embeddings[0]
                .precomputed_word_embeddings.index2word)

    def _load_vocab(self):
        vocab_raw = self._extract_embedding_vocab()

        # only words, no numbers or special chars
        word_re = re.compile(r'[a-z A-Z]{2,}')
        vocab_filt = [w for w in vocab_raw if word_re.fullmatch(w)]

        # vocab is assumed to be ordered by frequency
        self._vocab = set(vocab_filt)

    @property
    def vocab(self):
        if not (self._vocab):
            self._load_vocab()
        return self._vocab

    def _sanitize_oov(self, sentences: List[flair.data.Sentence]):
        for sent in sentences:
            sent.tokens = [t for t in sent.tokens if t.text in self.vocab]

    def _truncate_long_texts(self, sentences: List[flair.data.Sentence]):
        for sent in sentences:
            sent.tokens = sent.tokens[:self._max_pred_tokens]


class TransfomerModel(RNNModel):
    flair_model_name = 'sentiment'

    def _extract_embedding_vocab(self):
        return list(self.model.document_embeddings.tokenizer.vocab.keys())


# model = RNNModel()
model = TransfomerModel()

model.load()
