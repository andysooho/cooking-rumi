<div align="center">

# 🎮 냉장고를 부탁해 · Please, My Fridge!

**Pixel Art × AI 쿠킹 시뮬레이션** | **Pixel Art × AI Cooking Simulation**

> *"당신의 냉장고 속 재료로, AI가 요리를 완성합니다."*
> *"Your fridge ingredients. Your AI chef. Your recipe."*

[![Gemini in Entertainment](https://img.shields.io/badge/Google%20Hackathon-Gemini%20in%20Entertainment-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://google.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![PixiJS](https://img.shields.io/badge/PixiJS-v8-e91e63?style=for-the-badge)](https://pixijs.com)
[![Gemini API](https://img.shields.io/badge/Gemini%20API-2.5%20Flash-34a853?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)

</div>

---

## 🇰🇷 한국어

### 개요

**냉장고를 부탁해**는 **Google Gemini API**를 핵심 엔진으로 활용한 픽셀 아트 스타일의 AI 인터랙티브 쿠킹 게임입니다.

사용자가 실제 냉장고 속 재료 사진을 업로드하면, AI 셰프 **루미(Rumi)**가 재료를 자동으로 인식하고 픽셀 아트 이미지로 변환합니다. 이후 선택한 모드에 따라 최고의 요리를 선정하고, 사용자는 픽셀 아트 주방에서 재료를 조리도구에 **드래그 앤 드롭**하며 요리를 완성합니다. 마지막으로 AI가 사용자의 요리 과정을 정답 레시피와 비교해 **일치율 점수**와 함께 전문 셰프의 피드백을 제공합니다.

> 🏆 **Google Gemini Hackathon — "Gemini in Entertainment"** 출품작
> 한국 엔터테인먼트 강점(게임 + 요리 문화)에 Google AI를 결합한 차세대 에듀테인먼트 게임입니다.

---

### ✨ 핵심 특징

| 기능 | 설명 |
|------|------|
| 📸 **실제 냉장고 연동** | 냉장고/재료 사진을 업로드하면 AI가 재료를 자동 인식 |
| 🎨 **AI 픽셀 아트 생성** | Gemini가 각 재료를 16-bit 레트로 스타일 픽셀 아트로 즉시 변환 |
| 🍝 **두 가지 게임 모드** | 정통 레시피를 추구하는 **맛있는 모드** vs 퓨전 요리의 **창의적 모드** |
| 🎮 **드래그 앤 드롭 쿠킹** | 픽셀 아트 주방에서 재료를 조리도구에 드래그하여 요리 진행 |
| ⚡ **실시간 AI 반응** | 조리 액션마다 AI 셰프 루미가 1초 이내로 즉각 반응 |
| 📊 **AI 요리 평가** | 완성된 요리와 정답 레시피를 AI가 비교하여 일치율 점수 제공 |

---

### 🎮 게임 플로우

```
① 모드 선택        → 🍝 맛있는 음식 / 🧪 창의적인 음식
② 재료 업로드      → 냉장고·재료 사진 업로드 (최대 10장)
③ AI 재료 인식     → Gemini가 재료 자동 식별 & 확인
④ 픽셀 아트 생성   → 각 재료를 픽셀 아트로 병렬 변환
⑤ 요리 선정 & 힌트 → AI 셰프 루미가 요리 결정 후 3가지 힌트 제공
⑥ 쿠킹 스테이지   → 재료를 도마·프라이팬·냄비에 드래그하며 요리
⑦ AI 평가 & 결과  → 일치율(%) + 전체 레시피 + 루미의 코멘트
```

---

### 🛠️ 기술 스택

| 구분 | 기술 | 역할 |
|------|------|------|
| **프레임워크** | Next.js 16 (App Router) | 웹 앱 기반 & API Routes |
| **게임 렌더링** | PixiJS v8 | 픽셀 아트 Canvas 게임 엔진 |
| **AI 모델 (분석)** | `gemini-2.5-flash` | 재료 이미지 분석, 요리 선정, 최종 평가 |
| **AI 모델 (실시간)** | `gemini-2.0-flash-lite` | 조리 액션 즉각 반응 (< 1초) |
| **AI 모델 (이미지)** | `gemini-2.5-flash` | 픽셀 아트 이미지 생성 |
| **상태 관리** | Zustand | 게임 상태 전역 관리 |
| **스타일링** | TailwindCSS v4 | UI 레이어 스타일링 |
| **배포** | Vercel | 서버리스 배포 |

---

### 🚀 시작하기

#### 사전 요구사항
- Node.js 20+
- Google Gemini API 키 ([Google AI Studio](https://aistudio.google.com)에서 발급)

#### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-org/gemini-hackathon-project.git
cd gemini-hackathon-project

# 패키지 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일에 GEMINI_API_KEY=your_api_key_here 입력

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 (데스크탑 권장)

---



---

## 🇺🇸 English

### Overview

**Please, My Fridge!** is a pixel art-style interactive AI cooking game powered by the **Google Gemini API**.

Users upload photos of their actual fridge or ingredients. The AI chef **Rumi** automatically recognizes those ingredients and transforms them into charming pixel art sprites. Based on the selected game mode, Rumi picks a dish and gives hints. Players then **drag and drop** ingredients onto cooking tools in a pixel art kitchen to prepare the dish. Finally, the AI compares the player's cooking process against Rumi's secret recipe and delivers a **match score** along with detailed chef-level feedback.

> 🏆 **Built for Google Gemini Hackathon — "Gemini in Entertainment"**
> This project channels Korea's powerhouse entertainment culture—gaming and food—into a next-generation edutainment experience powered by Google AI.

---

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📸 **Real Fridge Integration** | Upload fridge/ingredient photos and Gemini auto-detects all ingredients |
| 🎨 **AI Pixel Art Generation** | Gemini instantly converts each ingredient into a 16-bit retro pixel art sprite |
| 🍝 **Two Game Modes** | **Delicious Mode** (classic recipes) vs **Creative Mode** (fusion cuisine) |
| 🎮 **Drag & Drop Cooking** | Drag pixel art ingredients onto cooking tools in a retro kitchen canvas |
| ⚡ **Real-time AI Reactions** | AI chef Rumi reacts to every cooking action in under 1 second |
| 📊 **AI Cooking Evaluation** | Gemini compares your process to the secret recipe and gives a match score |

---

### 🎮 Game Flow

```
① Select Mode      → 🍝 Delicious / 🧪 Creative
② Upload Photos    → Fridge & ingredient photos (up to 10 images)
③ AI Recognition   → Gemini identifies ingredients, player confirms
④ Pixel Art Gen    → Each ingredient converted to pixel art in parallel
⑤ Dish & Hints     → Rumi selects a dish & gives 3 mysterious hints
⑥ Cooking Stage    → Drag ingredients to cutting board, pan, pot, etc.
⑦ AI Evaluation    → Match rate (%) + full recipe reveal + Rumi's feedback
```

---

### 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Web app foundation & server API Routes |
| **Game Rendering** | PixiJS v8 | Pixel art Canvas game engine |
| **AI (Analysis)** | `gemini-2.5-flash` | Ingredient recognition, recipe selection, evaluation |
| **AI (Real-time)** | `gemini-2.0-flash-lite` | Sub-1-second cooking action reactions |
| **AI (Image Gen)** | `gemini-2.5-flash` | Pixel art image generation |
| **State Management** | Zustand | Global game state |
| **Styling** | TailwindCSS v4 | UI layer styling |
| **Deployment** | Vercel | Serverless deployment |

---

### 🚀 Getting Started

#### Prerequisites
- Node.js 20+
- Google Gemini API Key (get one at [Google AI Studio](https://aistudio.google.com))

#### Installation & Run

```bash
# Clone the repository
git clone https://github.com/your-org/gemini-hackathon-project.git
cd gemini-hackathon-project

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local: GEMINI_API_KEY=your_api_key_here

# Run the development server
npm run dev
```

Open `http://localhost:3000` in your browser (desktop recommended)

---

## 🎨 Why Pixel Art?

Korea has a deep-rooted love for retro gaming aesthetics and street food culture. By merging **16-bit nostalgia** with **AI-powered real-time interactivity**, *Please, My Fridge!* creates an experience that is:

- 🎮 **Familiar** — retro game UX lowers the barrier to entry
- 🍜 **Culturally resonant** — cooking is a universal language in Korea
- 📚 **Educational** — players learn real cooking techniques through play
- 🤩 **Surprising** — your actual fridge ingredients become game sprites

---

## 📜 License

MIT License © 2026 Please, My Fridge! Team

---

<div align="center">

**Made with ❤️ and 🍳 for Google Gemini Hackathon 2026**

*Powered by [Google Gemini API](https://ai.google.dev) · Built with [Next.js](https://nextjs.org) · Rendered by [PixiJS](https://pixijs.com)*

</div>
