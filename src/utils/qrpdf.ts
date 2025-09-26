"use client";

import type { DeviceRow } from "@/schemas/deviceSchema";

/* ============================================================
   1) ป้ายเดี่ยว: ดาวน์โหลดทันทีเป็น PDF (วาดลงแคนวาสแล้วฝังลง PDF)
   ============================================================ */
export async function downloadDeviceQRAsPDF(
  device: DeviceRow,
  opts?: { unitName?: string }
) {
  const [{ default: QRCode }, { default: jsPDF }] = await Promise.all([
    import("qrcode"),
    import("jspdf"),
  ]);

  const targetUrl = `${window.location.origin}/devices/${device.id}`;

  // วาดป้ายลง Canvas ก่อน
  const label = await makeLabelCanvas(QRCode, device, targetUrl, {
    unitName: opts?.unitName ?? "สำนักคอมพิวเตอร์",
  });

  // สร้าง PDF เท่าขนาดป้ายพอดี
  const png = label.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [label.width, label.height],
  });
  pdf.addImage(png, "PNG", 0, 0, label.width, label.height);
  const asset = device.assetTag || device.deviceId || String(device.id);
  pdf.save(`QR_${asset}.pdf`);
}

/* ============================================================
   2) หลายเครื่อง: รวมเป็นไฟล์เดียว (จัดวางเป็นกริดบน A4/Letter)
   ============================================================ */
type BatchOptions = {
  unitName?: string;
  cols?: number;         // จำนวนคอลัมน์ (ค่าเริ่มต้น 2)
  rows?: number;         // จำนวนแถวต่อหน้า (ค่าเริ่มต้น 4)
  page?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  buildTargetUrl?: (d: DeviceRow) => string; // กำหนด URL ของ QR เองได้
};

export async function downloadDevicesQRBatchPDF(
  devices: DeviceRow[],
  opts: BatchOptions = {}
) {
  const [{ default: QRCode }, { default: jsPDF }] = await Promise.all([
    import("qrcode"),
    import("jspdf"),
  ]);

  const unitName = opts.unitName ?? "สำนักคอมพิวเตอร์";
  const page = opts.page ?? "A4";
  const orientation = opts.orientation ?? "portrait";
  const cols = Math.max(1, opts.cols ?? 2);
  const rows = Math.max(1, opts.rows ?? 4);
  const buildTargetUrl =
    opts.buildTargetUrl ??
    ((d: DeviceRow) => `${window.location.origin}/devices/${d.id}`);

  // ขนาดกระดาษ (pt)
  const pageSize =
    page === "Letter"
      ? orientation === "portrait"
        ? [612, 792]
        : [792, 612]
      : orientation === "portrait"
        ? [595.28, 841.89]
        : [841.89, 595.28]; // A4
  const [pageW, pageH] = pageSize;

  // ระยะขอบ และช่องไฟในกริด
  const margin = 24;
  const gutterX = 12;
  const gutterY = 12;

  // คำนวณพื้นที่ใช้งาน และขนาด cell
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const cellW = (contentW - gutterX * (cols - 1)) / cols;
  const cellH = (contentH - gutterY * (rows - 1)) / rows;

  const pdf = new jsPDF({ orientation, unit: "pt", format: [pageW, pageH] });

  // ขนาดป้ายฐาน (px) — ใช้สัดส่วนเดียวกับโหมดเดี่ยว
  const baseLabelW = 820;
  const baseLabelH = 300;

  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];

    // วาดป้ายของอุปกรณ์แต่ละตัว
    const labelCanvas = await makeLabelCanvas(QRCode, d, buildTargetUrl(d), {
      unitName,
      width: baseLabelW,
      height: baseLabelH,
    });

    // จัดตำแหน่งลงกริด
    const indexInPage = i % (cols * rows);
    const col = indexInPage % cols;
    const row = Math.floor(indexInPage / cols);

    if (indexInPage === 0 && i !== 0) {
      pdf.addPage([pageW, pageH], orientation);
    }

    const x = margin + col * (cellW + gutterX);
    const y = margin + row * (cellH + gutterY);

    // สเกลให้พอดี cell (คงอัตราส่วน)
    const scale = Math.min(
      cellW / labelCanvas.width,
      cellH / labelCanvas.height
    );
    const drawW = labelCanvas.width * scale;
    const drawH = labelCanvas.height * scale;

    // จัดป้ายให้อยู่กลาง cell
    const dx = x + (cellW - drawW) / 2;
    const dy = y + (cellH - drawH) / 2;

    pdf.addImage(labelCanvas.toDataURL("image/png"), "PNG", dx, dy, drawW, drawH);
  }

  pdf.save(`QR_Batch_${devices.length}_labels.pdf`);
}

/* ============================================================
   3) makeLabelCanvas: วาดป้าย (QR ซ้าย + ข้อความขวา) ลง Canvas
      - ฝั่งซ้าย: QR code + กรอบแดงรอบ QR
      - ฝั่งขวา: ข้อความ 3 บรรทัด (ตัดบรรทัดอัตโนมัติ) จัด "กึ่งกลางแนวตั้ง"
      - เพิ่มกรอบดำรอบ "ป้ายทั้งใบ"
   ============================================================ */
async function makeLabelCanvas(
  QRCode: any,
  device: DeviceRow,
  targetUrl: string,
  opts?: { unitName?: string; width?: number; height?: number }
) {
  // ---- ค่าพื้นฐานของป้าย ----
  const unitNameLine1 = opts?.unitName ?? "สำนักคอมพิวเตอร์";
  const unitNameLine2 = "มหาวิทยาลัยราชภัฏนครราชสีมา";
  const W = opts?.width ?? 820;
  const H = opts?.height ?? 300;

  // ระยะขอบป้าย + ช่องไฟแนวนอนระหว่าง QR กับบล็อกข้อความ
  const pad = 26;
  const gapX = 30;

  // ---- ขนาด QR และบล็อกข้อความ (ขวา) ----
  const qrSize = Math.min(280, H - pad * 2);
  const textBlockX = pad + qrSize + gapX;
  const textBlockW = W - (textBlockX + pad);

  // สร้าง Canvas
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // ===== กรอบรอบป้ายทั้งใบ (ดำ) =====
  // ใช้ 2px และวาดให้คม (stroke วาดกึ่งกลางเส้น)
  const labelBorder = 2;
  ctx.save();
  ctx.strokeStyle = "#111827"; // slate-900
  ctx.lineWidth = labelBorder;
  const half = labelBorder / 2;
  ctx.strokeRect(half, half, W - labelBorder, H - labelBorder);
  ctx.restore();

  /* ===================== ฝั่งซ้าย: QR + กรอบแดง ===================== */
  // วาด QR ให้อยู่ "กึ่งกลางแนวตั้ง" ของป้าย
  const qx = pad;
  const qy = (H - qrSize) / 2;

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, targetUrl, {
    width: qrSize,
    margin: 0,
    errorCorrectionLevel: "M",
  });
  ctx.drawImage(qrCanvas, qx, qy);

  // กรอบ QR สีแดง: ให้ "ขอบสี" ห่างจากตัว QR = 2px และความหนาเส้น 2px
  const qrGap = 10;        // ช่องว่างจาก "สีของเส้น" ถึงตัว QR
  const qrStroke = 10;     // ความหนาเส้น
  const qrRadius = 6; 
  // strokeRect วาดกึ่งกลางเส้น → ต้องเลื่อน path ออกไปอีก qrStroke/2
  const o = qrGap + qrStroke / 6;

  ctx.save();
  ctx.strokeStyle = "#DC2626"; // red-600
  ctx.lineWidth = qrStroke;

  const x = qx - o;
  const y = qy - o;
  const w = qrSize + 2 * o;
  const h = qrSize + 2 * o;

  // ถ้าบราวเซอร์รองรับ roundRect ใช้ได้เลย
  if (typeof (ctx as any).roundRect === "function") {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, w, h, qrRadius);
    ctx.stroke();
  } else {
    // fallback สำหรับบางเบราว์เซอร์
    strokeRoundedRect(ctx, x, y, w, h, qrRadius);
  }
  ctx.restore();

  /* ===================== ฝั่งขวา: ข้อความ (จัดกึ่งกลางแนวตั้ง) ===================== */
  // เตรียมข้อความ
  const asset = device.deviceId || String(device.id);
  const line1 = `รหัสครุภัณฑ์ : ${asset}`;
  const line2 = unitNameLine1;
  const line3 = unitNameLine2;

  // ตั้งค่า style/ความสูงบรรทัดในแต่ละบล็อก
  const fontL1 = '700 36px "Noto Sans Thai", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const fontL2 = '700 32px "Noto Sans Thai", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const fontL3 = '700 32px "Noto Sans Thai", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const lh1 = 44;    // line height ของบรรทัด 1
  const lh2 = 40;    // line height ของบรรทัด 2
  const lh3 = 36;    // line height ของบรรทัด 3
  const vGap = 8;    // ช่องว่างแนวตั้งระหว่างบล็อกข้อความ

  // ตัดบรรทัด (wrap) ล่วงหน้าเพื่อรู้ "ความสูงรวม" ก่อนวาดจริง
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";

  ctx.font = fontL1;
  const lines1 = wrapLines(ctx, line1, textBlockW, 3); // จำกัดสูงสุด 3 บรรทัด
  ctx.font = fontL2;
  const lines2 = wrapLines(ctx, line2, textBlockW, 2); // จำกัดสูงสุด 2 บรรทัด
  ctx.font = fontL3;
  const lines3 = wrapLines(ctx, line3, textBlockW, 1); // จำกัดสูงสุด 1 บรรทัด

  // คำนวณความสูงรวมของบล็อกข้อความทั้งหมด
  const totalTextH =
    lines1.length * lh1 +
    vGap +
    lines2.length * lh2 +
    vGap +
    lines3.length * lh3;

  // จัดให้อยู่ "กึ่งกลางแนวตั้งของป้าย"
  let textY = (H - totalTextH) / 2;

  // วาดจริง (บล็อก 1 → 2 → 3)
  ctx.font = fontL1;
  textY = drawLines(ctx, lines1, textBlockX, textY, lh1);
  textY += vGap;

  ctx.font = fontL2;
  textY = drawLines(ctx, lines2, textBlockX, textY, lh2);
  textY += vGap;

  ctx.font = fontL3;
  textY = drawLines(ctx, lines3, textBlockX, textY, lh3);

  return canvas;
}

/* ============================================================
   4) Utilities: วาดข้อความหลายบรรทัด / ตัดบรรทัดตามความกว้าง
   ============================================================ */

// วาด array ของบรรทัดเรียงลงมาพร้อม lineHeight; คืนค่า y ถัดไป
function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number
) {
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

// แบ่งข้อความเป็นหลายบรรทัดตาม maxWidth; ถ้าเกิน maxLines จะใส่ "…"
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Infinity
) {
  if (ctx.measureText(text).width <= maxWidth) return [text];

  const lines: string[] = [];
  let cur = "";

  for (let i = 0; i < text.length; i++) {
    const next = cur + text[i];
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
      continue;
    }

    // ต้องตัดบรรทัด
    if (cur.length === 0) {
      // อักษรเดี่ยวก็เกิน ให้ตัดตัวเดียวกันลูปค้าง
      lines.push(text[i]);
    } else {
      lines.push(cur);
      cur = text[i];
    }

    // บรรทัดสุดท้าย: ยัดส่วนที่เหลือพร้อม … ให้พอดี
    if (lines.length === maxLines - 1) {
      const rest = text.slice(i + 1);
      const last = fitWithEllipsis(ctx, cur + rest, maxWidth);
      lines.push(last);
      return lines;
    }
  }

  if (cur) lines.push(cur);

  // เผื่อเกิน maxLines แบบหลายบรรทัด → รวมส่วนเกินเป็นบรรทัดสุดท้าย + …
  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines - 1);
    const last = fitWithEllipsis(
      ctx,
      lines.slice(maxLines - 1).join(""),
      maxWidth
    );
    return [...trimmed, last];
  }

  return lines;
}

// บีบข้อความให้พอดีความกว้างด้วยการใส่ "…"
function fitWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const ell = "…";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const s = text.slice(0, mid) + ell;
    if (ctx.measureText(s).width <= maxWidth) low = mid + 1;
    else high = mid;
  }
  return text.slice(0, Math.max(0, low - 1)) + ell;
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
  ctx.stroke();
}
