import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from django.conf import settings

logger = logging.getLogger("iot_app.coreiot")


def _join_url(base: str, path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


class CoreIoTClient:
    def __init__(self) -> None:
        self.base_url = getattr(settings, "COREIOT_BASE_URL", "").strip()
        self.auth_header = getattr(settings, "COREIOT_AUTH_HEADER", "Authorization")
        self.auth_prefix = getattr(settings, "COREIOT_AUTH_PREFIX", "Bearer ")
        self.timeout = int(getattr(settings, "COREIOT_TIMEOUT_SECONDS", 10))
        self.token = getattr(settings, "COREIOT_ACCESS_TOKEN", "") or ""

    def _build_auth_value(self) -> str:
        prefix = (self.auth_prefix or "Bearer").strip()
        if not prefix:
            prefix = "Bearer"
        # Accept either 'Bearer' or 'Bearer ' in env and normalize to 'Bearer <token>'.
        return f"{prefix} {self.token}".strip()

    def _extract_token(self, payload: Any) -> str:
        if not isinstance(payload, dict):
            return ""
        candidates = ["accessToken", "access_token", "token", "access", "jwt"]
        for key in candidates:
            value = payload.get(key)
            if isinstance(value, str) and value:
                return value
        data = payload.get("data")
        if isinstance(data, dict):
            for key in candidates:
                value = data.get(key)
                if isinstance(value, str) and value:
                    return value
        return ""

    def _request(self, method: str, url: str, body: dict[str, Any] | None = None, retry_auth: bool = True) -> dict[str, Any] | list[Any] | str | None:
        headers = {
            "Content-Type": "application/json",
        }
        if self.token:
            headers[self.auth_header] = self._build_auth_value()

        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                text = resp.read().decode("utf-8")
                if not text:
                    return None
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    return text
        except urllib.error.HTTPError as e:
            if e.code in (401, 403) and retry_auth:
                if self.login():
                    return self._request(method, url, body=body, retry_auth=False)
            detail = e.read().decode("utf-8", errors="ignore")
            logger.warning("CoreIoT request failed %s %s: %s %s", method, url, e.code, detail)
            return None
        except Exception as e:
            logger.warning("CoreIoT request error %s %s: %s", method, url, e)
            return None

    def login(self) -> bool:
        login_url = getattr(settings, "COREIOT_LOGIN_URL", "").strip()
        email = getattr(settings, "COREIOT_EMAIL", "").strip()
        password = getattr(settings, "COREIOT_PASSWORD", "").strip()

        if not login_url or not email or not password:
            return False

        url = _join_url(self.base_url, login_url)
        # CoreIoT deployments may expect different login field names.
        payload_candidates = [
            {"username": email, "password": password},
            {"email": email, "password": password},
            {"userName": email, "password": password},
        ]

        for payload in payload_candidates:
            result = self._request("POST", url, body=payload, retry_auth=False)
            token = self._extract_token(result)
            if token:
                self.token = token
                logger.info("CoreIoT login success")
                return True

        logger.warning("CoreIoT login failed: cannot extract token")
        return False
    
    def _find_telemetry_dict(self, payload: Any) -> dict[str, Any]:
        wanted_keys = set(getattr(settings, "COREIOT_TELEMETRY_KEYS", ["brightness", "temperature", "humidity", "light"]))

        def walk(node: Any) -> dict[str, Any] | None:
            if isinstance(node, dict):
                # If this dictionary contains telemetry keys we care about, flatten list values.
                if any(k in node for k in wanted_keys):
                    flattened = {}
                    for k, v in node.items():
                        if k in wanted_keys and isinstance(v, list) and len(v) > 0:
                            first_item = v[0]
                            if isinstance(first_item, dict):
                                flattened[k] = first_item.get("value")
                            else:
                                flattened[k] = first_item
                        else:
                            flattened[k] = v
                    return flattened
                for value in node.values():
                    found = walk(value)
                    if found is not None:
                        return found
            elif isinstance(node, list):
                for item in node:
                    found = walk(item)
                    if found is not None:
                        return found
            return None

        found = walk(payload)
        return found or {}

    def fetch_latest_telemetry(self, coreiot_device_id: str) -> dict[str, Any]:
        template = getattr(settings, "COREIOT_TELEMETRY_URL_TEMPLATE", "").strip()
        if not template or not coreiot_device_id:
            return {}

        encoded_device_id = urllib.parse.quote(str(coreiot_device_id), safe="")
        path = template.replace("{device_id}", encoded_device_id)
        url = _join_url(self.base_url, path)
        result = self._request("GET", url)
        return self._find_telemetry_dict(result)

    def set_brightness(self, coreiot_device_id: str, brightness: int) -> bool:
        template = getattr(settings, "COREIOT_SETSTATE_URL_TEMPLATE", "").strip()
        if not template or not coreiot_device_id:
            return False

        encoded_device_id = urllib.parse.quote(str(coreiot_device_id), safe="")
        path = template.replace("{device_id}", encoded_device_id)
        url = _join_url(self.base_url, path)

        value = max(0, min(255, int(brightness)))
        mode = getattr(settings, "COREIOT_SETSTATE_MODE", "rpc").strip().lower()
        brightness_key = getattr(settings, "COREIOT_BRIGHTNESS_KEY", "brightness")

        if mode == "direct":
            body = {
                brightness_key: value,
            }
        else:
            method_name = getattr(settings, "COREIOT_SETSTATE_METHOD", "setState")
            body = {
                "method": method_name,
                "params": value,
            }

        result = self._request("POST", url, body=body)
        return result is not None
    