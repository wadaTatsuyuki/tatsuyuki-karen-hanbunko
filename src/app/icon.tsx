import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// 半分ずつ色の違う丸（ふたりで半分こ）
export default function Icon() {
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
        <div style={{ display: "flex", width: 340, height: 340 }}>
          <div
            style={{
              width: 164,
              height: 340,
              background: "#2a7f8c",
              borderTopLeftRadius: 170,
              borderBottomLeftRadius: 170,
            }}
          />
          <div style={{ width: 12 }} />
          <div
            style={{
              width: 164,
              height: 340,
              background: "#c4561f",
              borderTopRightRadius: 170,
              borderBottomRightRadius: 170,
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
