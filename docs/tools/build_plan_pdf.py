"""Builds docs/stamps-bridge-plan.pdf.

Usage:  python3 -m venv docs/tools/.venv && docs/tools/.venv/bin/pip install reportlab
        docs/tools/.venv/bin/python docs/tools/build_plan_pdf.py docs/stamps-bridge-plan.pdf
Uses the Arial font that ships with macOS.
"""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon

OUT = sys.argv[1]

pdfmetrics.registerFont(TTFont("Arial", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial", boldItalic="Arial-Bold")

# Colours (no purple)
INK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#6b7280")
LINE = colors.HexColor("#d1d5db")
SOFT = colors.HexColor("#f3f4f6")
WIX = colors.HexColor("#1d4ed8")      # blue
WIX_SOFT = colors.HexColor("#dbeafe")
STAMPS = colors.HexColor("#0f766e")   # teal
STAMPS_SOFT = colors.HexColor("#ccfbf1")
FILE = colors.HexColor("#b45309")     # amber
FILE_SOFT = colors.HexColor("#fef3c7")
OK = colors.HexColor("#15803d")
WARN = colors.HexColor("#b45309")
WHITE = colors.white

PAGE_W, PAGE_H = A4
M = 18 * mm
CW = PAGE_W - 2 * M  # content width

ss = {
    "h1": ParagraphStyle("h1", fontName="Arial-Bold", fontSize=24, leading=29, textColor=INK, spaceAfter=6),
    "sub": ParagraphStyle("sub", fontName="Arial", fontSize=12, leading=17, textColor=MUTED, spaceAfter=14),
    "h2": ParagraphStyle("h2", fontName="Arial-Bold", fontSize=16, leading=20, textColor=INK, spaceBefore=6, spaceAfter=8),
    "h3": ParagraphStyle("h3", fontName="Arial-Bold", fontSize=12, leading=16, textColor=INK, spaceBefore=8, spaceAfter=4),
    "p": ParagraphStyle("p", fontName="Arial", fontSize=10, leading=14.5, textColor=INK, spaceAfter=6),
    "small": ParagraphStyle("small", fontName="Arial", fontSize=8.5, leading=12, textColor=MUTED, spaceAfter=4),
    "cell": ParagraphStyle("cell", fontName="Arial", fontSize=9, leading=12.5, textColor=INK),
    "cellb": ParagraphStyle("cellb", fontName="Arial-Bold", fontSize=9, leading=12.5, textColor=INK),
    "callout": ParagraphStyle("callout", fontName="Arial", fontSize=10.5, leading=15, textColor=INK),
}


def P(t, s="p"):
    return Paragraph(t, ss[s])


def bullets(items, s="p"):
    return [Paragraph(f"•&nbsp;&nbsp;{i}", ParagraphStyle("b", parent=ss[s], leftIndent=12, firstLineIndent=-9)) for i in items]


def table(rows, widths, header=True, zebra=True):
    data = [[P(c, "cellb" if (header and r == 0) else "cell") if isinstance(c, str) else c for c in row]
            for r, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    st = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
    ]
    if header:
        st += [("BACKGROUND", (0, 0), (-1, 0), SOFT), ("LINEBELOW", (0, 0), (-1, 0), 1, INK)]
    t.setStyle(TableStyle(st))
    return t


def callout(text, colour=WIX, soft=WIX_SOFT):
    t = Table([[P(text, "callout")]], colWidths=[CW])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), soft),
        ("LINEBEFORE", (0, 0), (0, -1), 3, colour),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return t


# ---------- drawing helpers ----------
def box(d, x, y, w, h, fill, stroke, r=6, sw=1):
    d.add(Rect(x, y, w, h, rx=r, ry=r, fillColor=fill, strokeColor=stroke, strokeWidth=sw))


def text(d, x, y, s, size=9, font="Arial", colour=INK, anchor="start"):
    d.add(String(x, y, s, fontName=font, fontSize=size, fillColor=colour, textAnchor=anchor))


def lines_c(d, cx, top, items, size=9, gap=12, font="Arial", colour=INK):
    for i, s in enumerate(items):
        text(d, cx, top - i * gap, s, size, font if i else "Arial-Bold", colour, "middle")


def arrow(d, x1, y1, x2, y2, colour=INK, sw=1.4, head=6):
    d.add(Line(x1, y1, x2, y2, strokeColor=colour, strokeWidth=sw))
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    p1 = (x2 - head * math.cos(a - 0.45), y2 - head * math.sin(a - 0.45))
    p2 = (x2 - head * math.cos(a + 0.45), y2 - head * math.sin(a + 0.45))
    d.add(Polygon([x2, y2, p1[0], p1[1], p2[0], p2[1]], fillColor=colour, strokeColor=colour))


def file_icon(d, x, y, w, h, label, sub):
    fold = 9
    d.add(Polygon([x, y, x + w, y, x + w, y + h - fold, x + w - fold, y + h, x, y + h],
                  fillColor=FILE_SOFT, strokeColor=FILE, strokeWidth=1))
    d.add(Polygon([x + w - fold, y + h, x + w - fold, y + h - fold, x + w, y + h - fold],
                  fillColor=FILE, strokeColor=FILE))
    text(d, x + w / 2, y + h / 2 + 2, label, 8.5, "Arial-Bold", FILE, "middle")
    text(d, x + w / 2, y + h / 2 - 10, sub, 7.5, "Arial", FILE, "middle")


# ---------- diagram 1: how they connect ----------
def connection_diagram():
    W, H = CW, 270
    d = Drawing(W, H)
    # Wix
    wx, wy, ww, wh = 0, 20, 160, 230
    box(d, wx, wy, ww, wh, WIX_SOFT, WIX, 8)
    text(d, wx + ww / 2, wy + wh - 20, "WIX SITE", 11, "Arial-Bold", WIX, "middle")
    text(d, wx + ww / 2, wy + wh - 34, "already paid for (Premium)", 7.5, "Arial", WIX, "middle")
    box(d, wx + 14, wy + 130, ww - 28, 46, WHITE, WIX, 5)
    lines_c(d, wx + ww / 2, wy + 158, ["Wix Orders", "paid orders live here"], 8.5)
    box(d, wx + 14, wy + 20, ww - 28, 90, WHITE, WIX, 5, 1.6)
    lines_c(d, wx + ww / 2, wy + 90, ["Stamps Bridge app", "runs inside Wix", "no server, no fee", "builds + reads files"], 8.5, 12)
    arrow(d, wx + ww / 2 - 18, wy + 130, wx + ww / 2 - 18, wy + 112, WIX)
    arrow(d, wx + ww / 2 + 18, wy + 112, wx + ww / 2 + 18, wy + 130, WIX)
    text(d, wx + ww / 2 - 22, wy + 119, "reads", 6.5, "Arial", WIX, "end")
    text(d, wx + ww / 2 + 22, wy + 119, "writes tracking", 6.5, "Arial", WIX, "start")

    # Stamps.com
    sx, sy, sw_, sh = W - 160, 20, 160, 230
    box(d, sx, sy, sw_, sh, STAMPS_SOFT, STAMPS, 8)
    text(d, sx + sw_ / 2, sy + sh - 20, "STAMPS.COM", 11, "Arial-Bold", STAMPS, "middle")
    text(d, sx + sw_ / 2, sy + sh - 34, "shipper's own account + postage", 7.5, "Arial", STAMPS, "middle")
    box(d, sx + 14, sy + 130, sw_ - 28, 46, WHITE, STAMPS, 5)
    lines_c(d, sx + sw_ / 2, sy + 158, ["Orders tab", "Import  >  print labels"], 8.5)
    box(d, sx + 14, sy + 40, sw_ - 28, 46, WHITE, STAMPS, 5)
    lines_c(d, sx + sw_ / 2, sy + 68, ["History tab", "Export printed labels"], 8.5)
    arrow(d, sx + sw_ / 2, sy + 130, sx + sw_ / 2, sy + 88, STAMPS)
    text(d, sx + sw_ / 2 + 5, sy + 106, "labels printed", 6.5, "Arial", STAMPS, "start")

    # files in the middle
    mx = wx + ww
    gap = sx - mx
    fw, fh = 92, 46
    fx = mx + gap / 2 - fw / 2
    # top: orders.csv
    ty = wy + 133
    file_icon(d, fx, ty, fw, fh, "orders.csv", "addresses + items")
    arrow(d, wx + ww - 14, wy + 70 + 40, fx - 4, ty + fh / 2, FILE)
    arrow(d, fx + fw + 4, ty + fh / 2, sx + 14, sy + 153, FILE)
    text(d, fx + fw / 2, ty + fh + 22, "1  MORNING", 9, "Arial-Bold", INK, "middle")
    text(d, fx + fw / 2, ty + fh + 10, "Shipper clicks Download, then Import", 7.5, "Arial", MUTED, "middle")
    # bottom: shipments.csv
    by = wy + 40
    file_icon(d, fx, by, fw, fh, "shipments.csv", "tracking numbers")
    arrow(d, sx + 14, sy + 63, fx + fw + 4, by + fh / 2, FILE)
    arrow(d, fx - 4, by + fh / 2, wx + ww - 14, wy + 45, FILE)
    text(d, fx + fw / 2, by - 14, "2  END OF DAY", 9, "Arial-Bold", INK, "middle")
    text(d, fx + fw / 2, by - 26, "Shipper clicks Export, then Upload", 7.5, "Arial", MUTED, "middle")
    return d


# ---------- diagram 2: swimlane flow ----------
def swimlane():
    lanes = [("CUSTOMER", INK, SOFT), ("WIX + STAMPS BRIDGE", WIX, WIX_SOFT),
             ("SHIPPER", FILE, FILE_SOFT), ("STAMPS.COM", STAMPS, STAMPS_SOFT)]
    steps = [  # (lane, title, detail)
        (0, "1  Pays on the website", "Wix checkout or own front end"),
        (1, "2  Appears in 'To ship'", "paid and not yet shipped"),
        (2, "3  Download orders", "one click, file ready-made"),
        (3, "4  Import the file", "Orders > Import"),
        (2, "5  Pick, pack, weigh", "stock held by the shipper"),
        (3, "6  Print labels", "own carrier and postage"),
        (2, "7  Export + upload", "History > Export, drop in app"),
        (1, "8  Marked shipped", "tracking saved on the order"),
        (0, "9  Shipped email", "with a tracking link"),
    ]
    W = CW
    head = 30
    row = 44
    H = head + row * len(steps) + 8
    d = Drawing(W, H)
    lw = W / 4
    for i, (name, c, soft) in enumerate(lanes):
        x = i * lw
        d.add(Rect(x + 2, 0, lw - 4, H - head + 2, fillColor=soft, strokeColor=None))
        box(d, x + 2, H - head + 4, lw - 4, head - 6, c, c, 4)
        text(d, x + lw / 2, H - head + 13, name, 8.5, "Arial-Bold", WHITE, "middle")
    bw, bh = lw - 16, 32
    centres = []
    for j, (lane, t, det) in enumerate(steps):
        c = lanes[lane][1]
        cx = lane * lw + lw / 2
        y = H - head - (j + 1) * row + (row - bh) / 2
        box(d, cx - bw / 2, y, bw, bh, WHITE, c, 5, 1.2)
        text(d, cx - bw / 2 + 7, y + bh - 13, t, 8, "Arial-Bold", INK)
        text(d, cx - bw / 2 + 7, y + 7, det, 6.6, "Arial", MUTED)
        centres.append((cx, y, y + bh))
    for j in range(len(steps) - 1):
        cx1, b1, t1 = centres[j]
        cx2, b2, t2 = centres[j + 1]
        if cx1 == cx2:
            arrow(d, cx1, b1, cx2, t2 + 1, INK, 1)
        else:
            midy = (b1 + t2) / 2
            d.add(Line(cx1, b1, cx1, midy, strokeColor=INK, strokeWidth=1))
            d.add(Line(cx1, midy, cx2, midy, strokeColor=INK, strokeWidth=1))
            arrow(d, cx2, midy, cx2, t2 + 1, INK, 1)
    return d


# ---------- screen mock-ups ----------
def window(d, W, H, active):
    box(d, 0, 0, W, H, WHITE, LINE, 6)
    d.add(Rect(0, H - 26, W, 26, fillColor=SOFT, strokeColor=None))
    d.add(Line(0, H - 26, W, H - 26, strokeColor=LINE))
    text(d, 12, H - 17, "Stamps Bridge", 9, "Arial-Bold", INK)
    tabs = ["To ship (4)", "Upload shipments", "Setup"]
    x = 110
    for i, t in enumerate(tabs):
        tw = 9 + len(t) * 4.6
        if i == active:
            box(d, x - 6, H - 22, tw, 18, WIX, WIX, 4)
            text(d, x, H - 16, t, 8, "Arial-Bold", WHITE)
        else:
            text(d, x, H - 16, t, 8, "Arial", MUTED)
        x += tw + 10


def button(d, x, y, label, w=None, fill=WIX):
    w = w or 14 + len(label) * 4.9
    box(d, x - w, y, w, 20, fill, fill, 4)
    text(d, x - w / 2, y + 6.5, label, 8.5, "Arial-Bold", WHITE, "middle")


def grid(d, x, top, cols, widths, rows, status_col=None):
    # header
    cx = x
    for c, w in zip(cols, widths):
        text(d, cx, top, c, 7.5, "Arial-Bold", MUTED)
        cx += w
    d.add(Line(x, top - 5, x + sum(widths), top - 5, strokeColor=LINE))
    for r, row in enumerate(rows):
        y = top - 19 - r * 17
        cx = x
        for k, (v, w) in enumerate(zip(row, widths)):
            colour = INK
            font = "Arial"
            if status_col is not None and k == status_col:
                colour = OK if v.startswith("Ready") else MUTED
                font = "Arial-Bold" if v.startswith("Ready") else "Arial"
            text(d, cx, y, v, 8, font, colour)
            cx += w
        d.add(Line(x, y - 6, x + sum(widths), y - 6, strokeColor=SOFT))


def screen_to_ship():
    W, H = CW, 200
    d = Drawing(W, H)
    window(d, W, H, 0)
    text(d, 16, H - 46, "4 paid orders waiting to ship", 10, "Arial-Bold", INK)
    text(d, 16, H - 59, "Showing orders placed since 12 Nov 2026", 7.5, "Arial", MUTED)
    grid(d, 16, H - 80, ["ORDER", "DATE", "CUSTOMER", "SHIP TO", "ITEMS"], [70, 70, 120, 120, 40], [
        ["#10342", "14 Nov", "A. Thompson", "Brooklyn, US", "2"],
        ["#10343", "14 Nov", "R. Clarke", "Leeds, GB", "1"],
        ["#10344", "15 Nov", "M. Joseph", "Miami, US", "3"],
        ["#10345", "15 Nov", "K. Baptiste", "Toronto, CA", "1"],
    ])
    box(d, 16, 14, 230, 20, FILE_SOFT, FILE_SOFT, 4)
    text(d, 24, 21, "! #10343: one item has no weight set", 8, "Arial", WARN)
    button(d, W - 16, 14, "Download for Stamps.com (4)")
    return d


def screen_upload():
    W, H = CW, 245
    d = Drawing(W, H)
    window(d, W, H, 1)
    dz_y = H - 92
    d.add(Rect(16, dz_y, W - 32, 52, rx=6, ry=6, fillColor=SOFT, strokeColor=LINE, strokeDashArray=[4, 3]))
    text(d, W / 2, dz_y + 31, "Drop your Stamps.com history export here", 9.5, "Arial-Bold", INK, "middle")
    text(d, W / 2, dz_y + 16, "or choose a file", 8, "Arial", MUTED, "middle")
    text(d, 16, dz_y - 16, "Found 4 labels in shipments.csv", 9, "Arial-Bold", INK)
    grid(d, 16, dz_y - 34, ["ORDER", "CARRIER", "TRACKING NUMBER", "STATUS"], [70, 80, 160, 150], [
        ["#10342", "UPS", "1Z999AA10123456784", "Ready"],
        ["#10343", "GlobalPost", "GP82736451", "Ready"],
        ["#10344", "UPS", "1Z999AA10123456791", "Ready"],
        ["#10339", "UPS", "1Z999AA10123456700", "Already shipped, skipped"],
    ], status_col=3)
    button(d, W - 16, 12, "Confirm: mark 3 as shipped", fill=OK)
    return d


def dropdown(d, x, y, w, label, colour=INK):
    box(d, x, y - 5, w, 16, WHITE, LINE, 3)
    text(d, x + 6, y, label, 7.8, "Arial", colour)
    d.add(Polygon([x + w - 12, y + 5, x + w - 5, y + 5, x + w - 8.5, y + 1], fillColor=MUTED, strokeColor=MUTED))


def match_tag(d, x, y, kind):
    label, fill, colour = {
        "list": ("From the fixed list", STAMPS_SOFT, STAMPS),
        "chose": ("Chosen by the store", WIX_SOFT, WIX),
        "none": ("No match: choose", FILE_SOFT, WARN),
    }[kind]
    w = 8 + len(label) * 3.9
    box(d, x, y - 4, w, 13, fill, fill, 6)
    text(d, x + 4, y, label, 6.8, "Arial-Bold", colour)


def screen_setup_orders():
    W, H = CW, 296
    d = Drawing(W, H)
    window(d, W, H, 2)
    text(d, 16, H - 46, "Step 1  Your Stamps.com order layout", 10, "Arial-Bold", INK)
    text(d, 16, H - 60, "sample.csv uploaded  ·  7 columns found  ·  5 matched from the list  ·  2 set by the store",
         7.5, "Arial", MUTED)
    button(d, W - 16, H - 64, "Upload a new sample", fill=MUTED)
    cols = [16, 170, 360]
    top = H - 86
    for c, lab in zip(cols, ["STAMPS.COM COLUMN", "FILL WITH", "MATCHED BY"]):
        text(d, c, top, lab, 7.2, "Arial-Bold", MUTED)
    d.add(Line(16, top - 5, W - 16, top - 5, strokeColor=LINE))
    rows = [
        ("Order ID  (required)", "Wix order number", "list"),
        ("Recipient Name", "Shipping: full name", "list"),
        ("Address 1", "Shipping: address line 1", "list"),
        ("Country", "Shipping: country (2-letter code)", "list"),
        ("Weight (oz)", "Total weight, in oz", "list"),
        ("Gift Message", "Leave blank", "chose"),
        ("Cost Code", 'Fixed value: "SHOP"', "chose"),
    ]
    for i, (c1, c2, kind) in enumerate(rows):
        y = top - 22 - i * 21
        text(d, cols[0], y, c1, 8, "Arial-Bold" if i == 0 else "Arial", INK)
        dropdown(d, cols[1], y, 175, c2)
        match_tag(d, cols[2], y, kind)
    button(d, W - 16, 12, "Save layout")
    text(d, 16, 18, "Headers are kept word for word and in the same order, as Stamps.com requires.", 7.3, "Arial", MUTED)
    return d


def screen_setup_history():
    W, H = CW, 292
    d = Drawing(W, H)
    box(d, 0, 0, W, H, WHITE, LINE, 6)
    text(d, 16, H - 22, "Step 2  Your Stamps.com history layout", 10, "Arial-Bold", INK)
    text(d, 16, H - 36, "From one history export. Only four columns are needed.", 7.5, "Arial", MUTED)
    cols = [16, 170, 360]
    top = H - 58
    for c, lab in zip(cols, ["THE APP NEEDS", "COLUMN IN YOUR FILE", "MATCHED BY"]):
        text(d, c, top, lab, 7.2, "Arial-Bold", MUTED)
    d.add(Line(16, top - 5, W - 16, top - 5, strokeColor=LINE))
    rows = [("Order ID  (required)", "Order ID", "list"), ("Tracking number  (required)", "Tracking #", "list"),
            ("Carrier", "Carrier", "list"), ("Service", "Mail Class", "chose")]
    for i, (c1, c2, kind) in enumerate(rows):
        y = top - 22 - i * 21
        text(d, cols[0], y, c1, 8, "Arial", INK)
        dropdown(d, cols[1], y, 175, c2)
        match_tag(d, cols[2], y, kind)
    y0 = top - 22 - 4 * 21 - 14
    d.add(Line(16, y0, W - 16, y0, strokeColor=LINE))
    text(d, 16, y0 - 18, "Step 3  Everyday settings", 10, "Arial-Bold", INK)
    gen = [("Only include orders from", "12 Nov 2026"), ("Default carrier", "UPS"),
           ("Who emails the customer?", "Wix")]
    for i, (k, v) in enumerate(gen):
        y = y0 - 40 - i * 21
        text(d, 16, y, k, 8, "Arial", INK)
        dropdown(d, 170, y, 175, v)
    return d


# ---------- page decoration ----------
def on_page(c, doc):
    c.saveState()
    c.setFont("Arial", 7.5)
    c.setFillColor(MUTED)
    c.drawString(M, 10 * mm, "Stamps Bridge  ·  Wix to Stamps.com, without a paid connector")
    c.drawRightString(PAGE_W - M, 10 * mm, f"Page {doc.page}")
    c.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=M, bottomMargin=18 * mm,
                      title="Stamps Bridge: Wix to Stamps.com", author="Siddhesh")
doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(M, 18 * mm, CW, PAGE_H - M - 18 * mm, id="f")],
                                   onPage=on_page)])

s = []
# ---- Page 1: summary
s += [P("Stamps Bridge", "h1"),
      P("A free Wix app that connects a Wix store to a Stamps.com account. No Shopify, no ShipStation, "
        "no monthly fee in between. Works for any Wix store.", "sub")]
s.append(callout("<b>In one line:</b> paid Wix orders go to Stamps.com as a file, labels are printed as normal, "
                 "and the tracking numbers come back the same way. The app does all the formatting, matching and "
                 "updating. The only human steps are one download in the morning and one upload at the end of the day."))
s.append(Spacer(1, 4))
s.append(P("The problem", "h2"))
s += bullets([
    "Stamps.com only pulls orders automatically from stores it chose to support, such as Shopify, Amazon, eBay and "
    "BigCommerce. <b>Wix is not one of them</b>, and Wix confirms there is no direct link.",
    "The paid workarounds cost money every month: ShipStation starts at about $30 a month for this, and a "
    "Shopify store plus the Stamps.com app would be about $600 to $720 a year.",
])
s.append(P("The solution", "h2"))
s += bullets([
    "<b>Both tools already accept and produce files.</b> Stamps.com can import orders from a CSV file and export "
    "printed labels, with tracking numbers, to a CSV file. The file is the connector.",
    "<b>Stamps Bridge</b> is a small app that lives inside the Wix dashboard. It writes the file Stamps.com wants, "
    "reads the file Stamps.com gives back, and updates the Wix orders.",
    "Wix runs the app's code, so there is <b>no server and no hosting bill</b>. It can be published free on the "
    "Wix App Market and open-sourced for any Wix seller with the same problem.",
    "<b>Nothing is hardcoded and no AI is used.</b> Each store uploads its own Stamps.com sample file once and "
    "confirms the column matches.",
])
s.append(P("What it costs", "h2"))
s.append(table([
    ["Item", "Who pays", "Extra cost"],
    ["Wix Premium plan", "Store owner (already paying)", "None"],
    ["Stamps.com account and postage", "Shipper (already paying)", "None, if their plan includes CSV import"],
    ["Stamps Bridge app and hosting", "Nobody", "£0. Free, open source, Wix runs it"],
], [CW * 0.38, CW * 0.32, CW * 0.30]))
s.append(Spacer(1, 2))
s.append(P("What is automatic and what is not", "h2"))
s.append(table([
    ["Automatic (the app does it)", "Manual (a person clicks)"],
    ["Finding new paid orders, writing the file, matching tracking numbers, marking orders shipped, emailing customers",
     "One download and import in the morning, one export and upload at the end of the day"],
], [CW / 2, CW / 2]))
s.append(PageBreak())

# ---- Page 2: how they connect
s.append(P("How Wix and Stamps.com connect", "h2"))
s.append(P("Wix and Stamps.com never talk to each other directly. Two files carry the data between them, one "
           "in each direction. Stamps Bridge sits inside Wix and handles both."))
s.append(Spacer(1, 6))
s.append(connection_diagram())
s.append(Spacer(1, 10))
s.append(P("The key that links them: the Order ID", "h3"))
s.append(P("Every row in both files carries the Wix order number (for example <b>10342</b>). Stamps.com keeps it "
           "on the order it imports, so when the label history comes back the app knows which order each "
           "tracking number belongs to. <b>Still to confirm:</b> that the history export includes this column. "
           "The first real export will show it. If it doesn't, the shipper pastes tracking numbers into the Upload tab instead."))
s.append(P("What travels in each file", "h3"))
s.append(table([
    ["", "orders.csv  (Wix to Stamps.com)", "shipments.csv  (Stamps.com to Wix)"],
    ["Made by", "Stamps Bridge, one click", "Stamps.com History > Export"],
    ["Used by", "Stamps.com Orders > Import", "Stamps Bridge, Upload tab"],
    ["Contains", "Order ID, name, full address, email, phone, SKUs, item names, quantities, prices, weights",
     "Order ID (to confirm), carrier, service, tracking number, date printed"],
    ["Safe to repeat?", "Yes. Stamps.com updates an order with the same Order ID instead of copying it",
     "Yes. Orders already marked shipped are skipped"],
], [CW * 0.18, CW * 0.41, CW * 0.41]))
s.append(Spacer(1, 8))
s.append(callout("<b>Why this is safe to repeat:</b> downloading the same orders twice never creates duplicates in "
                 "Stamps.com, and uploading the same history twice never ships an order twice. A mistake can be "
                 "fixed by doing the step again.", STAMPS, STAMPS_SOFT))
s.append(PageBreak())

# ---- Page 3: end-to-end flow
s.append(P("The end-to-end process", "h2"))
s.append(P("One order from payment to the customer's inbox. Each column is who does the step."))
s.append(Spacer(1, 4))
s.append(swimlane())
s.append(Spacer(1, 6))
s.append(P("Steps 2, 8 and 9 happen by themselves. Steps 3 to 7 are the shipper's normal working day with two extra clicks.",
           "small"))
s.append(Spacer(1, 8))

# ---- shipper's day + screens
s.append(P("The shipper's daily routine", "h2"))
s.append(table([
    ["When", "Where", "What the shipper does", "Time"],
    ["Morning", "Wix > Stamps Bridge > To ship", "Click <b>Download for Stamps.com</b>", "10 sec"],
    ["Morning", "Stamps.com > Orders > Import", "Choose the downloaded file, click Import", "20 sec"],
    ["During the day", "Warehouse + Stamps.com", "Pick, pack, weigh, print labels (unchanged)", "as today"],
    ["End of day", "Stamps.com > History > Export", "Export today's printed labels", "20 sec"],
    ["End of day", "Wix > Stamps Bridge > Upload", "Drop the file in, check the list, click <b>Confirm</b>", "30 sec"],
], [CW * 0.15, CW * 0.32, CW * 0.41, CW * 0.12]))
s.append(PageBreak())
s.append(P("The screens", "h2"))
s.append(P("Stamps Bridge is one page in the Wix dashboard with three tabs. The shipper gets a Wix login limited to "
           "this page and the orders list."))
s.append(KeepTogether([P("Tab 1: To ship", "h3"), screen_to_ship()]))
s.append(Spacer(1, 6))
s.append(KeepTogether([P("Tab 2: Upload shipments", "h3"), screen_upload()]))
s.append(PageBreak())

s.append(P("Tab 3: Setup, once per store", "h2"))
s.append(P("Each store teaches the app its own Stamps.com file layout. This is what keeps the app generic: "
           "nothing about any one store is written into the code."))
s += bullets([
    "<b>Upload your sample.csv</b> (Stamps.com > Orders > Import > Download sample file). The app reads only the "
    "header row and ignores the example and notes rows.",
    "<b>Check the matches.</b> Each column is filled from a Wix field, left blank, or given a fixed value.",
    "<b>Upload one history export</b> so the app knows where the Order ID and tracking number are.",
])
s.append(Spacer(1, 4))
s.append(screen_setup_orders())
s.append(PageBreak())
s.append(screen_setup_history())
s.append(Spacer(1, 10))
s.append(callout("<b>No AI, no guessing.</b> The code holds a fixed list of known header names, such as "
                 "'Order ID' and 'Recipient Name'. It ignores capitals, spaces and punctuation, then looks for an exact "
                 "match. A header that isn't on the list is left blank for the store to choose. The same file always "
                 "gives the same result.", STAMPS, STAMPS_SOFT))
s.append(Spacer(1, 8))
s.append(P("What lives in the code and what lives with each store", "h3"))
s.append(table([
    ["In the code (the same for every store)", "Saved per store, on its own Wix site"],
    ["The list of Wix fields that can fill a column", "Its sample.csv header row, word for word"],
    ["The fixed list of known header names", "Its column matches and fixed values"],
    ["Reading and writing CSV files", "Its history export matches"],
    ["Finding orders and marking them shipped", "Start date, default carrier, who emails the customer"],
], [CW / 2, CW / 2]))
s.append(P("Safety checks", "h3"))
s += bullets([
    "No order file can be downloaded until the <b>Order ID</b> column is matched.",
    "An upload missing the Order ID or tracking column is refused, with the missing column named.",
    "When a new sample is uploaded, the app lists which columns were added or removed before saving.",
])
s.append(PageBreak())
s.append(P("What everyone else sees", "h2"))
s.append(table([
    ["Who", "What changes for them"],
    ["Customer", "Nothing new. They order as usual and get a 'Your order has shipped' email with a tracking link."],
    ["Store owner", "In the normal Wix Orders list, orders move from <b>Not fulfilled</b> to <b>Fulfilled</b> each "
                    "evening with tracking attached. Nothing to do."],
    ["Shipper", "Two extra clicks a day. No retyping of addresses or tracking numbers. Their Stamps.com routine otherwise stays the same."],
], [CW * 0.2, CW * 0.8]))
s.append(Spacer(1, 10))

# ---- edge cases
s.append(P("When things don't go to plan", "h2"))
s.append(table([
    ["Situation", "What happens"],
    ["Customer cancels before the download", "Cancelled orders are left out of the file automatically."],
    ["Customer cancels after the import", "The shipper deletes it in Stamps.com. If it is in an upload, the app "
                                          "skips it and flags it."],
    ["Address changed after the import", "Edit it in Wix, then download again. Stamps.com updates the order "
                                         "because the Order ID matches. Do this before printing."],
    ["The same file is uploaded twice", "Orders already shipped are skipped. Nothing is sent twice."],
    ["A label is printed outside the Orders tab", "It has no Order ID, so it shows as 'not matched' and is ignored."],
    ["One order needs two parcels", "Version 1 saves one tracking number per order. Add the second by hand in Wix."],
    ["Label refunded and reprinted", "Version 1 skips orders already shipped. Correct the tracking by hand in Wix."],
    ["International parcel", "Customs details are completed in Stamps.com as today. Item values and weights "
                             "come through in the file."],
    ["A product has no weight or SKU", "The To ship tab warns before download, so it can be fixed in Wix first."],
    ["Stamps.com changes its columns", "Upload a new sample.csv in Setup. The app shows what changed. No code change."],
    ["A header isn't on the fixed list", "It stays blank until the store picks a match. The app never guesses."],
], [CW * 0.34, CW * 0.66]))
s.append(Spacer(1, 10))
s.append(P("Not in version 1", "h3"))
s += bullets(["Fully automatic transfer with no clicks. Stamps.com does not allow it for Wix.",
              "Returns, stock syncing between the shipper and Wix, and splitting one order across parcels."])
s.append(PageBreak())

# ---- Page 6: what's confirmed, what's needed, build plan
s.append(P("What is confirmed and what still needs checking", "h2"))
s.append(table([
    ["Fact", "Status", "Source"],
    ["Wix has no direct Stamps.com integration", "Confirmed", "Wix Help Centre"],
    ["Stamps.com Online imports orders from a CSV file; only Order ID is required", "Confirmed",
     "Stamps.com help: Import Orders from a CSV or TXT File"],
    ["Re-importing the same Order ID updates the order", "Confirmed", "Same article"],
    ["CSV headers must match Stamps.com's sample.csv exactly", "Confirmed", "Same article"],
    ["CSV import is only on certain Stamps.com plans", "Confirmed. Check each shipper's plan", "Same article"],
    ["Print history can be exported to CSV; columns can be shown or hidden", "Confirmed",
     "Stamps.com help: Export Your Print History; History Page"],
    ["The export includes the Order ID", "<b>Not yet confirmed</b>", "Needs a real export"],
    ["Wix app can mark an order fulfilled with tracking", "Confirmed", "Wix developer docs: createFulfillment"],
    ["That also sends Wix's shipping email", "<b>Not yet confirmed</b>", "Needs a test order"],
    ["Stamps.com can email tracking itself instead", "Confirmed", "Stamps.com help: Shipment Notification Emails"],
    ["Free apps can be published; Wix can host the code", "Confirmed", "Wix developer docs: App distribution"],
], [CW * 0.48, CW * 0.22, CW * 0.30]))
s.append(Spacer(1, 10))
s.append(P("Needed before building", "h3"))
s += bullets([
    "<b>From the first shipper:</b> the <i>sample.csv</i> from Stamps.com Orders > Import. This also proves "
    "their plan has CSV import, and becomes the first real test of Setup.",
    "<b>From the shipper:</b> one Print History export after printing a label for an imported order.",
    "<b>A test order</b> to see whether Wix sends the shipping email when the app adds tracking.",
])
s.append(KeepTogether([P("Build order", "h3"), table([
    ["#", "Step", "Done when"],
    ["1", "Create the app with the Wix CLI; install on a free Wix test store", "The dashboard page appears"],
    ["2", "Build Setup: upload sample.csv, match columns from the fixed list, save per store",
     "A real sample loads and every column is matched or chosen"],
    ["3", "Build the To ship tab and the download, using the saved layout", "The file imports cleanly into Stamps.com"],
    ["4", "Build history matching and the Upload tab", "A test order shows Fulfilled with a working tracking link"],
    ["5", "Choose who emails the customer", "Exactly one email arrives"],
    ["6", "Install on the first live store and set the start date", "One real order runs end to end"],
    ["7", "Publish free on the App Market", "A second store sets itself up with no code change"],
], [CW * 0.05, CW * 0.55, CW * 0.40])]))

s.append(Spacer(1, 10))
s.append(KeepTogether([P("Considered and rejected", "h3"), table([
    ["Option", "Why not"],
    ["ShipStation", "About $390 a year, and the shipper would print in ShipStation instead of Stamps.com."],
    ["A new Shopify store as a go-between", "About $600 to $720 a year (Shopify Basic plus the Stamps.com app). "
     "Shopify's $5 Starter plan is closed to new stores."],
    ["Stamps.com API", "No way to add orders to the Orders tab or read labels printed on the website. "
     "Printing through the API would change the shipper's routine."],
    ["AI to read the files", "Not wanted. A fixed list is predictable and gives the same result every time."],
], [CW * 0.3, CW * 0.7])]))

doc.build(s)
print("written", OUT)
