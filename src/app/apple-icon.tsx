import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// 半分ずつ色の違う丸（ふたりで半分こ）
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7f2",
        }}
      >
        <div style={{ display: "flex", width: 120, height: 120 }}>
          <div
            style={{
              width: 58,
              height: 120,
              background: "#2a7f8c",
              borderTopLeftRadius: 60,
              borderBottomLeftRadius: 60,
            }}
          />
          <div style={{ width: 4 }} />
          <div
            style={{
              width: 58,
              height: 120,
              background: "#c4561f",
              borderTopRightRadius: 60,
              borderBottomRightRadius: 60,
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
