"use client";

import type { DeviceRow } from "@/schemas/deviceSchema";

// -------- ป้ายเดี่ยว: ดาวน์โหลดทันที --------
export async function downloadDeviceQRAsPDF(
  device: DeviceRow,
  opts?: { unitName?: string }
) {
  const [{ default: QRCode }, { default: jsPDF }] = await Promise.all([
    import("qrcode"),
    import("jspdf"),
  ]);

  const targetUrl = `${window.location.origin}/devices/${device.id}`;

  // สร้างป้ายลงบน canvas (เลย์เอาต์เหมือนในตัวอย่าง)
  const label = await makeLabelCanvas(QRCode, device, targetUrl, {
    unitName: opts?.unitName ?? "สำนักคอมพิวเตอร์",
  });

  // สร้าง PDF ขนาดเท่ากับป้ายพอดี
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

// -------- หลายเครื่อง: รวมเป็นไฟล์เดียว (กริด A4) --------
type BatchOptions = {
  unitName?: string;     // ชื่อหน่วยงานใต้บรรทัด
  cols?: number;         // ต่อแถว (default 2)
  rows?: number;         // ต่อหน้า (default 4)
  page?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  // ถ้าอยากให้ลิงก์ QR ไป URL อื่น กำหนดเองได้ที่นี่
  buildTargetUrl?: (d: DeviceRow) => string;
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

  // ขนาดหน้า
  const pageSize =
    page === "Letter" ? (orientation === "portrait" ? [612, 792] : [792, 612]) // pt
                      : (orientation === "portrait" ? [595.28, 841.89] : [841.89, 595.28]); // A4
  const [pageW, pageH] = pageSize;

  // ระยะขอบและร่อง
  const margin = 24;  // pt
  const gutterX = 12; // ช่องไฟแนวนอน
  const gutterY = 12; // ช่องไฟแนวตั้ง

  // พื้นที่คอนเทนต์ + ขนาด cell
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const cellW = (contentW - gutterX * (cols - 1)) / cols;
  const cellH = (contentH - gutterY * (rows - 1)) / rows;

  // เตรียม doc
  const pdf = new jsPDF({ orientation, unit: "pt", format: [pageW, pageH] });

  // เราจะสร้าง label ด้วย canvas ก่อน แล้วฝังเป็นรูป
  // เลือกขนาด "ต้นฉบับ" ของ label (px) ให้ได้อัตราส่วน ~เหมือนตัวอย่าง
  const baseLabelW = 820;  // px
  const baseLabelH = 300;  // px

  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];

    // ทำ label canvas สำหรับอุปกรณ์นี้
    const labelCanvas = await makeLabelCanvas(QRCode, d, buildTargetUrl(d), {
      unitName,
      width: baseLabelW,
      height: baseLabelH,
    });

    // ตำแหน่งในหน้า
    const indexInPage = i % (cols * rows);
    const pageIndex = Math.floor(i / (cols * rows));
    const col = indexInPage % cols;
    const row = Math.floor(indexInPage / cols);

    if (indexInPage === 0 && i !== 0) {
      pdf.addPage([pageW, pageH], orientation);
    }

    // คำนวณตำแหน่งวางของ label ใน cell
    const x = margin + col * (cellW + gutterX);
    const y = margin + row * (cellH + gutterY);

    // สเกล label ให้พอดี cell (คงอัตราส่วน)
    const scale = Math.min(cellW / labelCanvas.width, cellH / labelCanvas.height);
    const drawW = labelCanvas.width * scale;
    const drawH = labelCanvas.height * scale;

    // จัดกลาง cell
    const dx = x + (cellW - drawW) / 2;
    const dy = y + (cellH - drawH) / 2;

    pdf.addImage(labelCanvas.toDataURL("image/png"), "PNG", dx, dy, drawW, drawH);
  }

  // ชื่อไฟล์
  pdf.save(`QR_Batch_${devices.length}_labels.pdf`);
}

/** --------- สร้างป้ายลงบน canvas (QR ซ้าย + ข้อความขวา) --------- */
async function makeLabelCanvas(
  QRCode: any,
  device: DeviceRow,
  targetUrl: string,
  opts?: { unitName?: string; width?: number; height?: number }
) {
  const unitName = opts?.unitName ?? "สำนักคอมพิวเตอร์";
  const W = opts?.width ?? 820;
  const H = opts?.height ?? 300;

  const pad = 24;
  const gap = 28;

  const qrSize = Math.min(280, H - pad * 2); // ให้ QR สูงพอดีกับป้าย
  const textBlockW = W - (pad + qrSize + gap + pad);

  // Canvas ป้าย
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // สร้าง QR
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, targetUrl, {
    width: qrSize,
    margin: 0,
    errorCorrectionLevel: "M",
  });
  ctx.drawImage(qrCanvas, pad, (H - qrSize) / 2);

  // ข้อความ
  const asset = device.deviceId || String(device.id);

  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";

  // บรรทัด 1
  ctx.font =
    '700 36px "Noto Sans Thai", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const line1 = `รหัสครุภัณฑ์ : ${asset}`;
  drawText(ctx, line1, pad + qrSize + gap, H / 2 - 20, textBlockW);

  // บรรทัด 2
  ctx.font =
    '700 32px "Noto Sans Thai", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  drawText(ctx, unitName, pad + qrSize + gap, H / 2 + 30, textBlockW);

  return canvas;
}

// ช่วยตัดคำไม่ให้ล้นกรอบ (แบบง่าย)
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  // ตัดข้อความแบบคร่าว ๆ
  const ellipsis = "…";
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const s = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(s).width <= maxWidth) low = mid + 1;
    else high = mid;
  }
  const s = text.slice(0, Math.max(0, low - 1)) + ellipsis;
  ctx.fillText(s, x, y);
}
