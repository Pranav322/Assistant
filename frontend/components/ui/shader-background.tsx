"use client";

import { useEffect, useRef } from "react";

// Matches app/globals.css tokens: dark keeps the deep navy/purple plasma
// palette; light uses a pale lavender bg with the royal-indigo (--primary
// ~236 77% 62%) line color so it reads on white. Read via .dark class +
// MutationObserver rather than useTheme(), which lags on first mount for
// system-dark sessions (see hero-demo-video.tsx for the same bug).
const DARK_THEME = {
  bg1: [0.1, 0.1, 0.3, 1] as const,
  bg2: [0.3, 0.1, 0.5, 1] as const,
  line: [0.4, 0.2, 0.8, 1] as const,
};
const LIGHT_THEME = {
  bg1: [0.96, 0.96, 0.99, 1] as const,
  bg2: [0.9, 0.89, 0.98, 1] as const,
  line: [0.29, 0.24, 0.93, 1] as const,
};

const VERTEX_SHADER_SOURCE = `
attribute vec4 aVertexPosition;
void main() {
  gl_Position = aVertexPosition;
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec4 uBg1;
uniform vec4 uBg2;
uniform vec4 uLineColor;

const float overallSpeed = 0.2;
const float gridSmoothWidth = 0.015;
const float axisWidth = 0.05;
const float majorLineWidth = 0.025;
const float minorLineWidth = 0.0125;
const float majorLineFrequency = 5.0;
const float minorLineFrequency = 1.0;
const float scale = 5.0;
const float minLineWidth = 0.01;
const float maxLineWidth = 0.2;
const float lineSpeed = 1.0 * overallSpeed;
const float lineAmplitude = 1.0;
const float lineFrequency = 0.2;
const float warpSpeed = 0.2 * overallSpeed;
const float warpFrequency = 0.5;
const float warpAmplitude = 1.0;
const float offsetFrequency = 0.5;
const float offsetSpeed = 1.33 * overallSpeed;
const float minOffsetSpread = 0.6;
const float maxOffsetSpread = 2.0;
const int linesPerGroup = 16;

#define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
#define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
#define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
#define drawPeriodicLine(freq, width, t) drawCrispLine(freq / 2.0, width, abs(mod(t, freq) - (freq) / 2.0))

float random(float t) {
  return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
}

float getPlasmaY(float x, float horizontalFade, float offset) {
  return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec4 fragColor;
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

  float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
  float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

  space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
  space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

  vec4 lines = vec4(0.0);

  for(int l = 0; l < linesPerGroup; l++) {
    float normalizedLineIndex = float(l) / float(linesPerGroup);
    float offsetTime = iTime * offsetSpeed;
    float offsetPosition = float(l) + space.x * offsetFrequency;
    float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
    float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
    float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
    float linePosition = getPlasmaY(space.x, horizontalFade, offset);
    float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

    float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
    vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
    float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

    line = line + circle;
    lines += line * uLineColor * rand;
  }

  fragColor = mix(uBg1, uBg2, uv.x);
  fragColor *= verticalFade;
  fragColor.a = 1.0;
  fragColor += lines;

  gl_FragColor = fragColor;
}
`;

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("ShaderBackground: shader compile failed", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initShaderProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("ShaderBackground: program link failed", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
    if (!gl) {
      console.warn("ShaderBackground: WebGL not supported");
      return;
    }

    const program = initShaderProgram(gl);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(program, "aVertexPosition");
    const resolutionLocation = gl.getUniformLocation(program, "iResolution");
    const timeLocation = gl.getUniformLocation(program, "iTime");
    const bg1Location = gl.getUniformLocation(program, "uBg1");
    const bg2Location = gl.getUniformLocation(program, "uBg2");
    const lineColorLocation = gl.getUniformLocation(program, "uLineColor");

    let theme = document.documentElement.classList.contains("dark") ? DARK_THEME : LIGHT_THEME;
    const themeObserver = new MutationObserver(() => {
      theme = document.documentElement.classList.contains("dark") ? DARK_THEME : LIGHT_THEME;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resize = () => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth ?? canvas.clientWidth;
      const height = parent?.clientHeight ?? canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const draw = (time: number) => {
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(positionLocation);

      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, time);
      gl.uniform4fv(bg1Location, theme.bg1);
      gl.uniform4fv(bg2Location, theme.bg2);
      gl.uniform4fv(lineColorLocation, theme.line);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrameId: number | null = null;
    let disposed = false;

    if (prefersReducedMotion) {
      draw(0);

      return () => {
        disposed = true;
        resizeObserver.disconnect();
        themeObserver.disconnect();
        gl.deleteProgram(program);
        gl.deleteBuffer(positionBuffer);
      };
    }

    const startTime = performance.now();
    const animate = () => {
      if (disposed) return;
      draw((performance.now() - startTime) / 1000);
      animationFrameId = requestAnimationFrame(animate);
    };

    // Pause the RAF loop (and its GPU draw calls) while the hero is scrolled
    // out of view; startTime is never reset, so time stays continuous on resume.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (disposed) return;
        if (entry.isIntersecting) {
          if (animationFrameId === null) animationFrameId = requestAnimationFrame(animate);
        } else if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      },
      { threshold: 0 },
    );
    if (canvas.parentElement) intersectionObserver.observe(canvas.parentElement);

    return () => {
      disposed = true;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      gl.deleteProgram(program);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

export default ShaderBackground;
