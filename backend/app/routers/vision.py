"""사진 속 식재료 후보를 찾는 비전 API.

사진 원본은 저장하지 않는다. 요청 한 번을 처리한 뒤 이미지 바이트는
파이썬 객체에서 사라지고, 응답에는 사용자가 확인할 후보만 남긴다.
"""

from __future__ import annotations

import base64
import binascii
import json
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings

router = APIRouter(prefix="/api", tags=["vision"])


class RecognizeRequest(BaseModel):
    image_data: str = Field(..., min_length=32, max_length=12_000_000)
    filename: str = Field("ingredient-image", max_length=180)


class IngredientCandidate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    category: str = Field("기타", max_length=30)
    confidence: float = Field(..., ge=0, le=1)
    unit: str = Field("개", max_length=30)
    notes: str = Field("", max_length=180)


class RecognizeResponse(BaseModel):
    ok: bool = True
    source: str = "OpenAI vision"
    candidates: list[IngredientCandidate] = Field(default_factory=list, max_length=8)
    message: str = ""
    needs_confirmation: bool = True


_DATA_URL = re.compile(r"^data:(image/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$", re.I)
_ALLOWED_CATEGORIES = {
    "채소", "과일", "육류", "수산물", "곡류", "콩류", "달걀·유제품", "조미료", "가공식품", "기타"
}


def _decode_image_data(value: str) -> tuple[str, bytes]:
    match = _DATA_URL.match(value.strip())
    if not match:
        raise HTTPException(status_code=422, detail="JPG, PNG, WEBP 형식의 data URL만 사용할 수 있습니다.")
    mime, encoded = match.groups()
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=422, detail="사진 데이터를 읽을 수 없습니다.") from exc
    if not raw or len(raw) > 8_000_000:
        raise HTTPException(status_code=413, detail="사진은 8MB 이하로 올려 주세요.")
    return mime.lower().replace("image/jpg", "image/jpeg"), raw


def _json_from_model(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.I | re.S).strip()
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="사진 분석 결과를 구조화하지 못했습니다.") from exc
    return value if isinstance(value, dict) else {}


def _clean_candidates(payload: dict[str, Any]) -> list[IngredientCandidate]:
    output: list[IngredientCandidate] = []
    seen: set[str] = set()
    for raw in payload.get("candidates", []):
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name", "")).strip()
        if not name or name in seen:
            continue
        category = str(raw.get("category", "기타")).strip()
        if category not in _ALLOWED_CATEGORIES:
            category = "기타"
        try:
            confidence = max(0.0, min(1.0, float(raw.get("confidence", 0))))
        except (TypeError, ValueError):
            confidence = 0.0
        unit = str(raw.get("unit", "개")).strip()[:30] or "개"
        notes = str(raw.get("notes", "")).strip()[:180]
        output.append(IngredientCandidate(name=name[:80], category=category, confidence=confidence, unit=unit, notes=notes))
        seen.add(name)
        if len(output) >= 8:
            break
    return sorted(output, key=lambda item: item.confidence, reverse=True)


def _client():
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="사진 인식을 사용하려면 서버에 OPENAI_API_KEY를 설정해야 합니다.")
    from openai import OpenAI

    return OpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/recognize", response_model=RecognizeResponse, summary="사진 속 식재료 후보 인식")
def recognize_ingredients(payload: RecognizeRequest) -> RecognizeResponse:
    mime, raw = _decode_image_data(payload.image_data)
    client = _client()
    prompt = """
사진에 보이는 식재료와 식품을 판별하세요. 한 장에 여러 품목이 있으면 각각 후보로 만드세요.
채소·과일만 제한하지 말고 육류, 수산물, 곡류, 콩류, 달걀·유제품, 조미료, 가공식품까지 모두 고려하세요.
포장 상품은 읽을 수 있는 상품명과 식품 종류를 함께 추정하고, 사진에 없는 정보는 만들지 마세요.
비슷한 후보를 최대 8개까지 confidence 내림차순으로 반환하되, 확신이 낮으면 confidence를 낮추세요.
응답은 반드시 아래 JSON 하나만 반환하세요.
{
  "candidates": [
    {"name":"식재료명", "category":"채소|과일|육류|수산물|곡류|콩류|달걀·유제품|조미료|가공식품|기타", "confidence":0.0, "unit":"개|봉|팩|kg|마리|단|병", "notes":"사진에서 확인한 근거 또는 불확실성"}
  ],
  "message":"사용자에게 보여줄 짧은 안내"
}
""".strip()

    try:
        response = client.chat.completions.create(
            model=settings.VISION_MODEL,
            messages=[
                {"role": "system", "content": "당신은 한국 장보기 앱의 식재료 사진 판별 도우미입니다."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}", "detail": "high"}},
                    ],
                },
            ],
            response_format={"type": "json_object"},
            max_tokens=settings.VISION_MAX_TOKENS,
            temperature=0.1,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"사진 분석 서비스에 연결하지 못했습니다: {exc.__class__.__name__}") from exc

    content = response.choices[0].message.content if response.choices else ""
    data = _json_from_model(content or "{}")
    candidates = _clean_candidates(data)
    if not candidates:
        return RecognizeResponse(
            candidates=[],
            message="사진에서 식재료를 확실히 찾지 못했습니다. 밝은 곳에서 한 품목씩 다시 찍어 주세요.",
        )
    return RecognizeResponse(
        candidates=candidates,
        message=str(data.get("message", "사진 속 후보를 확인한 뒤 가격을 입력해 주세요."))[:180],
    )
