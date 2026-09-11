"""시장 방문 보조 API: KAMIS 현재 소매가격 조회."""

from __future__ import annotations

import json
import os
from datetime import date, timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/market", tags=["market"])

CATEGORIES = {"식량작물": "100", "채소류": "200", "특용작물": "300", "과일류": "400", "축산물": "500", "수산물": "600"}


def _rows(node):
    if isinstance(node, list):
        if node and all(isinstance(x, dict) for x in node):
            return node
        for x in node:
            found = _rows(x)
            if found:
                return found
    if isinstance(node, dict):
        for key in ("item", "items", "data", "price", "list"):
            if key in node:
                found = _rows(node[key])
                if found:
                    return found
        for x in node.values():
            found = _rows(x)
            if found:
                return found
    return []


def _value(row, *keys):
    for key in keys:
        if row.get(key) not in (None, "", "-", "0"):
            return str(row[key]).strip()
    return ""


@router.get("/current", summary="KAMIS 현재 소매가격")
def current_price(category: str = Query("채소류"), limit: int = Query(12, ge=1, le=30)) -> dict:
    cert_key = os.getenv("KAMIS_CERT_KEY", "")
    cert_id = os.getenv("KAMIS_CERT_ID", "")
    if not cert_key or not cert_id:
        return {"ok": False, "source": "KAMIS", "message": "KAMIS 인증정보가 설정되지 않았습니다.", "items": []}

    yesterday = date.today() - timedelta(days=1)
    while yesterday.weekday() >= 5:
        yesterday -= timedelta(days=1)
    params = {
        "p_cert_key": cert_key,
        "p_cert_id": cert_id,
        "p_returntype": "json",
        "action": "dailyPriceByCategoryList",
        "p_product_cls_code": "01",
        "p_item_category_code": CATEGORIES.get(category, "200"),
        "p_regday": yesterday.isoformat(),
        "p_convert_kg_yn": "N",
    }
    url = os.getenv("KAMIS_BASE_URL", "http://www.kamis.or.kr/service/price/xml.do")
    try:
        req = Request(url + "?" + urlencode(params), headers={"User-Agent": "JecheolPlanner/2.0"})
        with urlopen(req, timeout=15) as res:
            payload = json.loads(res.read().decode("utf-8", errors="replace"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"KAMIS 조회 실패: {exc.__class__.__name__}") from exc

    result = []
    for row in _rows(payload):
        name = _value(row, "kind_name", "kindname", "item_name", "itemname")
        price = _value(row, "dpr1", "price", "retail_price", "value")
        if name and price:
            result.append({"name": name, "price": price, "unit": _value(row, "unit", "unit_name"), "date": yesterday.isoformat(), "source": "KAMIS"})
        if len(result) >= limit:
            break
    return {"ok": True, "source": "KAMIS", "category": category, "date": yesterday.isoformat(), "items": result}
