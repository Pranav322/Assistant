import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
    width: 32,
    height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 20, // Adjusted to match ratio (62.5% vs 50% in navbar) for better visibility
                    background: "hsl(240, 5.9%, 10%)", // Matches --primary from globals.css
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "hsl(0, 0%, 98%)", // Matches --primary-foreground from globals.css
                    borderRadius: "8px", // Matches rounded-md (6px for 24px box -> 8px for 32px box)
                    fontWeight: 700,
                }}
            >
                C
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
