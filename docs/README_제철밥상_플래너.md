# 제철밥상 플래너 2.0

제철 재료와 가격 데이터를 바탕으로 식단을 추천하고, 가족 장보기와 요리교실 운영을 돕는 AI 웹앱입니다.

## 주요 기능

- 오늘의 제철 재료와 가격 판정
- 예산·인원·난이도 기반 식단 추천
- 장바구니 예상 금액 계산
- KAMIS 가격 추이와 계절성 분석
- 대체 식재료 추천
- 사진으로 재료 확인
- 바코드로 상품·중량 확인
- 직접 가격 기록
- AI에게 가격·식단 질문
- 강사 모드의 수업용 예산·장보기 관리

## 실행 구조

```text
backend/    FastAPI API와 분석·추천 서비스
frontend/   HTML·CSS·JavaScript 반응형 화면
data/       정제된 가격·추천 데이터
docs/       기능설명서·결과보고서·시연자료
```

## 실행 방법

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 환경변수

```text
OPENAI_API_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
ALLOWED_ORIGINS=
```

실제 인증키와 서비스 계정 파일은 저장소에 포함하지 않습니다.

## 데이터 처리 원칙

- 같은 날짜·품목의 여러 가격은 중앙값으로 집계합니다.
- 가격이 부족한 품목은 “분석 불가”로 표시합니다.
- 사진·바코드 인식 결과는 사용자가 확인한 뒤 저장합니다.
- 예측 결과는 예언이 아니라 과거 계절 패턴에 기반한 참고값입니다.

## 팀미션 제출물

- README
- 기능설명서
- 결과보고서
- 시연자료
- Frontend·Backend 코드
- API·분석 데이터
- 실행 화면 및 배포 URL

