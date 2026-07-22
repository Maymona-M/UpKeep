"use client";

import { QRCodeSVG } from "qrcode.react";

// Renders a scannable QR code for the read-only family link, as an
// alternate to copy/pasting the URL (handy for showing on a phone in
// person, or printing and sticking on the fridge).
export default function FamilyLinkQr({ url, size = 148 }) {
  if (!url) return null;
  return (
    <div
      className="inline-flex flex-col items-center gap-2 rounded-2xl p-3"
      style={{ background: "white" }}
    >
      <QRCodeSVG value={url} size={size} bgColor="#ffffff" fgColor="#06202B" level="M" />
    </div>
  );
}
