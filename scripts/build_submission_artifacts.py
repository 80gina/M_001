from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PRESENTATION = ROOT / "presentation"
PDF_OUT = DOCS / "제철밥상_플래너_2.0_최종제출보고서.pdf"
PPTX_OUT = PRESENTATION / "제철밥상_플래너_2.0_최종발표자료.pptx"
SUBTITLE = "제철 식재료와 가격을 이해하는 AI 장보기 비서"

CREAM = colors.HexColor("#FFF8EE")
TERRACOTTA = colors.HexColor("#A65337")
SAGE = colors.HexColor("#72866B")
INK = colors.HexColor("#3E3028")
LINE = colors.HexColor("#EAD9C8")

def find_font():
    candidates = [
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            return path
    raise FileNotFoundError("Korean font not found")

FONT_PATH = find_font()
pdfmetrics.registerFont(TTFont("Korean", FONT_PATH))

def inline(text):
    text = escape(text.strip())
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font face='Courier'>\1</font>", text)
    return text

def build_pdf():
    styles = getSampleStyleSheet()
    normal = ParagraphStyle("KNormal", parent=styles["BodyText"], fontName="Korean", fontSize=9.3, leading=15, textColor=INK, spaceAfter=5)
    h1 = ParagraphStyle("KH1", parent=normal, fontSize=22, leading=30, textColor=TERRACOTTA, alignment=TA_CENTER, spaceAfter=10)
    h2 = ParagraphStyle("KH2", parent=normal, fontSize=15, leading=21, textColor=TERRACOTTA, spaceBefore=12, spaceAfter=7)
    h3 = ParagraphStyle("KH3", parent=normal, fontSize=11.5, leading=17, textColor=SAGE, spaceBefore=8, spaceAfter=5)
    quote = ParagraphStyle("KQuote", parent=normal, leftIndent=9, borderColor=LINE, borderWidth=1, borderPadding=7, backColor=CREAM)
    bullet = ParagraphStyle("KBullet", parent=normal, leftIndent=12, firstLineIndent=-7)
    table_text = ParagraphStyle("KTable", parent=normal, fontSize=7.5, leading=10)
    title = ParagraphStyle("KTitle", parent=h1, fontSize=27, leading=36, spaceBefore=55*mm)
    subtitle = ParagraphStyle("KSubtitle", parent=normal, fontSize=13, leading=20, textColor=SAGE, alignment=TA_CENTER)

    story = [
        Spacer(1, 14*mm),
        Paragraph("제철밥상 플래너 2.0", title),
        Paragraph(SUBTITLE, subtitle),
        Spacer(1, 12*mm),
        Paragraph("AI 네이티브 Final Project · 최종 제출 패키지", subtitle),
        Spacer(1, 55*mm),
        Paragraph("일반 가정 사용자 · 요리교실 강사", subtitle),
        PageBreak(),
    ]

    sources = [
        ("1. 제출보고서", DOCS / "제출보고서.md"),
        ("2. 평가 기준별 최종 체크리스트", DOCS / "평가기준_최종_체크리스트.md"),
        ("3. 시연 순서 정리보고서", DOCS / "시연순서_정리보고서.md"),
        ("4. 최종 결과보고서", DOCS / "최종_결과보고서.md"),
        ("5. 팀미션 적합성 최종 재평가", DOCS / "팀미션_재평가_최종.md"),
    ]

    for index, (label, path) in enumerate(sources):
        if index:
            story.append(PageBreak())
        story.append(Paragraph(label, h1))
        lines = path.read_text(encoding="utf-8").splitlines()
        i = 0
        while i < len(lines):
            line = lines[i].rstrip()
            if line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|?\s*:?-+", lines[i + 1]):
                rows = []
                while i < len(lines) and lines[i].lstrip().startswith("|"):
                    parts = [p.strip() for p in lines[i].strip().strip("|").split("|")]
                    if not all(re.fullmatch(r":?-+:?", p.replace(" ", "")) for p in parts):
                        rows.append([Paragraph(inline(p), table_text) for p in parts])
                    i += 1
                if rows:
                    widths = [(A4[0] - 32*mm) / max(len(r) for r in rows)] * max(len(r) for r in rows)
                    table = Table(rows, colWidths=widths, repeatRows=1)
                    table.setStyle(TableStyle([
                        ("FONTNAME", (0,0), (-1,-1), "Korean"),
                        ("BACKGROUND", (0,0), (-1,0), TERRACOTTA),
                        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                        ("BACKGROUND", (0,1), (-1,-1), colors.white),
                        ("GRID", (0,0), (-1,-1), 0.4, LINE),
                        ("VALIGN", (0,0), (-1,-1), "TOP"),
                        ("LEFTPADDING", (0,0), (-1,-1), 4),
                        ("RIGHTPADDING", (0,0), (-1,-1), 4),
                        ("TOPPADDING", (0,0), (-1,-1), 4),
                        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
                    ]))
                    story.extend([table, Spacer(1, 4)])
                continue
            if line.startswith("# "):
                story.append(Paragraph(inline(line[2:]), h1))
            elif line.startswith("## "):
                story.append(Paragraph(inline(line[3:]), h2))
            elif line.startswith("### "):
                story.append(Paragraph(inline(line[4:]), h3))
            elif line.startswith("> "):
                story.append(Paragraph(inline(line[2:]), quote))
            elif re.match(r"^[-*] ", line):
                story.append(Paragraph("• " + inline(line[2:]), bullet))
            elif re.match(r"^\d+\. ", line):
                story.append(Paragraph(inline(line), bullet))
            elif line.strip():
                story.append(Paragraph(inline(line), normal))
            else:
                story.append(Spacer(1, 3))
            i += 1

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Korean", 7.5)
        canvas.setFillColor(SAGE)
        canvas.drawString(16*mm, 10*mm, "제철밥상 플래너 2.0")
        canvas.drawRightString(A4[0]-16*mm, 10*mm, str(doc.page))
        canvas.restoreState()

    doc = SimpleDocTemplate(str(PDF_OUT), pagesize=A4, rightMargin=16*mm, leftMargin=16*mm, topMargin=15*mm, bottomMargin=16*mm, title="제철밥상 플래너 2.0 최종 제출보고서")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_text(slide, text, x, y, w, h, size=22, color=RGBColor(62,48,40), bold=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.clear()
    frame.word_wrap = True
    p = frame.paragraphs[0]
    p.text = text
    p.alignment = align
    p.font.name = "NanumGothic"
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    return box

def add_slide(prs, number, title, kicker, bullets, accent=RGBColor(166,83,55)):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, RGBColor(255,248,238))
    shape = slide.shapes.add_shape(1, Inches(0), Inches(0), Inches(0.16), Inches(7.5))
    shape.fill.solid(); shape.fill.fore_color.rgb = accent; shape.line.fill.background()
    add_text(slide, kicker.upper(), 0.55, 0.4, 6.5, 0.3, 10, accent, True)
    add_text(slide, title, 0.55, 0.82, 11.8, 0.7, 26, RGBColor(62,48,40), True)
    y = 1.75
    for item in bullets:
        add_text(slide, "• " + item, 0.75, y, 11.2, 0.62, 17, RGBColor(62,48,40))
        y += 0.72
    add_text(slide, f"{number:02d} / 12", 11.45, 7.05, 1.0, 0.25, 9, accent, True, PP_ALIGN.RIGHT)
    return slide

def build_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, RGBColor(255,248,238))
    add_text(slide, "🥘", 0.8, 0.65, 1.1, 0.8, 42)
    add_text(slide, "제철밥상 플래너 2.0", 0.85, 1.75, 11.5, 0.9, 34, RGBColor(166,83,55), True)
    add_text(slide, SUBTITLE, 0.88, 2.8, 11.0, 0.55, 20, RGBColor(114,134,107), True)
    add_text(slide, "AI 네이티브 Final Project", 0.9, 5.8, 5.8, 0.4, 14, RGBColor(62,48,40))
    add_text(slide, "일반 가정 사용자 · 요리교실 강사", 0.9, 6.3, 7.5, 0.4, 13, RGBColor(62,48,40))

    slides = [
        ("문제 정의", "WHY", ["제철이어도 지금 가격이 싼지 판단하기 어렵다", "식단·가격·시장 기록·장바구니가 여러 서비스로 분리된다", "요리교실 강사는 인원별 재료비 계산을 반복한다"]),
        ("두 명의 핵심 사용자", "USER", ["1차: 오늘 살 재료와 식단을 빠르게 결정하는 일반 가정 사용자", "2차: 수업 인원과 예산에 맞춰 준비하는 요리교실 강사", "공통 과업인 장보기 흐름을 공유하고 강사 기능만 확장한다"]),
        ("하나로 연결한 사용자 여정", "FLOW", ["밥상 조건 선택 → 메뉴 추천", "시장 사진·바코드·직접 입력 → 재료 확인", "장바구니 합계 → 강사 인원별 비용", "AI 질문 → 가격 근거 → 대화 저장"]),
        ("따뜻하고 쉬운 화면", "UX", ["크림색·테라코타색의 따뜻한 밥상 디자인", "모바일 하단 탭과 큰 버튼으로 한 손 조작", "복잡한 통계는 고급 화면으로 분리"]),
        ("시장 방문 기능", "MARKET", ["사진 미리보기와 최대 3개 후보 중 사용자 확인", "바코드 샘플 조회와 숫자 직접 입력 대체 경로", "채소·과일뿐 아니라 육류·수산물까지 포함", "운영형 Vision·OCR은 후속 개발로 명확히 구분"]),
        ("AI Agent 핵심 구조", "AI AGENT", ["GPT가 11개 Function Calling 도구 중 필요한 도구를 선택", "가격·통계·품목·대체재·대화 기록을 조회", "최대 3라운드 도구 실행 후 근거 기반 답변 생성"]),
        ("RAG와 Long-term Memory", "AI NATIVE", ["구조화 데이터 검색 결과를 답변 컨텍스트에 주입", "가격 판정은 서버 계산식으로 결정해 환각을 줄임", "대화 전체 저장·불러오기·이어 묻기 지원"]),
        ("시스템 구성", "ARCHITECTURE", ["Frontend: HTML·CSS·Vanilla JavaScript", "Backend: FastAPI·Pydantic·서비스/라우터 분리", "Data: Firestore·KAMIS·개발용 메모리 저장소", "AI: OpenAI GPT·Function Calling"]),
        ("팀미션 요구사항 대응", "MISSION", ["기획서·기능 요구사항·GitHub·발표자료·시연자료 구성", "AI Agent·검색 증강·Memory·자동화 워크플로우 적용", "생성형 AI 사용 표시·사진 비저장·사용자 최종 확인"]),
        ("3분 시연 순서", "DEMO", ["홈에서 문제와 사용자 설명", "밥상추천 → 시장담기 → 장바구니 → 강사모드", "AI 질문으로 가격 근거와 대화 저장 설명", "GitHub README와 체크리스트로 구현 증거 제시"]),
        ("성과와 한계", "RESULT", ["사용자 흐름·AI 데이터 비서 구조·문서 패키지 완성", "사진 인식은 사용자 확인형 프로토타입", "상품 DB·OCR·사용자 인증·운영 모니터링은 후속 범위"]),
    ]
    for i, (title, kicker, bullets) in enumerate(slides, start=2):
        add_slide(prs, i, title, kicker, bullets)

    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, RGBColor(166,83,55))
    add_text(slide, "제철에서 한 끼까지,", 1.0, 1.4, 11.2, 0.8, 30, RGBColor(255,248,238), True, PP_ALIGN.CENTER)
    add_text(slide, "근거 있는 장보기를 돕습니다.", 1.0, 2.35, 11.2, 0.8, 30, RGBColor(255,248,238), True, PP_ALIGN.CENTER)
    add_text(slide, "제철밥상 플래너 2.0", 1.0, 4.35, 11.2, 0.6, 22, RGBColor(255,255,255), True, PP_ALIGN.CENTER)
    add_text(slide, SUBTITLE, 1.0, 5.15, 11.2, 0.45, 15, RGBColor(255,235,220), False, PP_ALIGN.CENTER)
    add_text(slide, "12 / 12", 11.45, 7.05, 1.0, 0.25, 9, RGBColor(255,248,238), True, PP_ALIGN.RIGHT)

    prs.save(str(PPTX_OUT))

if __name__ == "__main__":
    DOCS.mkdir(exist_ok=True)
    PRESENTATION.mkdir(exist_ok=True)
    build_pdf()
    build_pptx()
    print(PDF_OUT)
    print(PPTX_OUT)
