import os
import unittest
from unittest.mock import patch

import kakao_api


class KakaoApiKeyTests(unittest.TestCase):
    def test_uses_env_var_for_rest_api_key(self):
        with patch.dict(os.environ, {"KAKAO_REST_API_KEY": "env-key"}, clear=True):
            self.assertEqual(kakao_api.get_kakao_rest_api_key(), "env-key")

    def test_returns_none_for_missing_key(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(kakao_api.get_kakao_rest_api_key())


if __name__ == "__main__":
    unittest.main(verbosity=2)
