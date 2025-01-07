import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises'; // fs.promises 사용

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 서버 포트
const port = 3000;

// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ 미들웨어
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 파싱
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 페이지 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/page1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/page2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'indexPage2.html'));
});

app.get('/page3', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'indexPage3.html'));
});

// ✅ JSON 파일 제공
app.get('/scenarioMakingPrompt.json', async (req, res) => {
  const filePath = path.join(__dirname, 'scenarioMakingPrompt.json');
  try {
    // 파일 존재 여부 확인
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Failed to serve scenarioMakingPrompt.json:', error);
    res.status(404).send('scenarioMakingPrompt.json not found');
  }
});

// ✅ JSON 파일 업데이트 라우트
app.post('/update-json', async (req, res) => {
  const jsonData = req.body; // 클라이언트로부터 받은 JSON 데이터
  const filePath = path.join(__dirname, 'scenarioMakingPrompt.json'); // 업데이트할 파일 경로
  try {
    if (!jsonData || Object.keys(jsonData).length === 0) {
      console.error('No JSON data received');
      return res.status(400).send('No JSON data received');
    }
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log('✅ JSON 파일이 성공적으로 업데이트되었습니다.');
    res.status(200).send('JSON file updated successfully');
  } catch (err) {
    console.error('❌ JSON 파일 업데이트 중 오류 발생:', err);
    res.status(500).send('Failed to update JSON file');
  }
});

// 현재 연결된 클라이언트 수 추적
let clientCount = 0;

io.on("connection", (socket) => {
  let responseText = "";
  console.log(`Client connected`);

  // 첫 번째 프롬프트 처리
  socket.on("firstPrompting", async ({ prompt }) => {
    console.log('Client sent prompt:', prompt);
    try {
      const firstInputText =
        "사용자 시나리오: " + prompt +
        "]\n" +
        ": 너가 유능한 서비스디자이너가 되었다고 가정하고, 이 시나리오를 개선하여 사용자 경험이 더욱 풍부해질 수 있도록 창의적인 아이디어를 추가해줘. vr 기기와 같은 내용은 현실적이지 않아서 넣지 마.";

      // OpenAI GPT-4 모델 호출
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: firstInputText }],
      });

      // 첫 번째 응답 저장
      responseText = completion.choices[0].message.content;
      console.log(`OpenAI first response:`, responseText);

      // 첫 번째 응답을 클라이언트에게 전송
      socket.emit("openai response", { response: responseText });
    } catch (error) {
      console.error("Error during first prompt:", error);
      socket.emit("openai response", {
        error: "An error occurred while contacting the OpenAI API.",
      });
    }
  });

  // 두 번째 프롬프트 처리 (이전 응답을 입력으로 사용)
  socket.on("secondPrompting", async () => {

    const secondInputText =
      "Main Artifact: 서비스의 physical artifact의 일종이며 제품, 공간, 장소 등을 포함한다. 또한, 사용자가 경험하는 무형의 인공물을 지칭하는 디자인 요소 즉 무형의 소프트웨어, 디지털 컨텐츠 등도 포함한다. " +
      "Sub Artifact: Main Artifact의 하위 항목으로, 보다 상세한 단계의 Artifact이다." +
      "]\n" +
      "사용자 시나리오: " + responseText +
      "]\n" +
      "이 시나리오에서 서술되고 있는 Main Artifact와 Sub Artifact, User를 추출하여 출력하시오. 출력되는 텍스트는 다음 [format]을 *반드시* 따를 것. [format] 이외의 텍스트를 출력하지 말 것.\n" +
      "당신의 응답을 JSON 형식으로 제공해주세요.\n" +
      "출력 형식:\n" +
      `{
    "artifacts": [
      {
        "mainArtifact": "Main Artifact 1",
        "subArtifacts": ["Sub Artifact 1-1", "Sub Artifact 1-2"]
      },
      {
        "mainArtifact": "Main Artifact 2",
        "subArtifacts": ["Sub Artifact 2-1", "Sub Artifact 2-2"]
      }
    ],
    "users": ["User 1", "User 2"]
  }`;


    try {
      // 첫 번째 응답인 responseText를 새로운 입력(prompt)로 사용
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: secondInputText }],
      });

      // 두 번째 응답 저장
      const secondResponseText = completion.choices[0].message.content;
      console.log(`OpenAI second response: `, secondResponseText);

      // 최종 응답을 클라이언트로 전송 (사이클 종료)
      socket.emit("final openai response", { response: secondResponseText });
    } catch (error) {
      console.error("Error during second prompt:", error);
      socket.emit("final openai response", {
        error: "An error occurred while re-asking the OpenAI API.",
      });
    }
  });

  socket.on("scenarioPrompting", async ({ prompt }) => {
    console.log('📤 Client sent prompt:', prompt);

    try {
      // ✅ 프롬프트 텍스트 구성
      const scenarioInputText = prompt +
        "]\n" +
        ": 너는 유능한 서비스 디자이너야. 이 json 파일을 참고하여 Key Interactions, Service Outcome & Value를 포함한 3문장 분량의 서비스 시나리오를 작성해줘.";

      // ✅ OpenAI API 호출
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: scenarioInputText }],
      });

      // ✅ OpenAI 응답 확인
      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("OpenAI API returned an empty response.");
      }

      console.log('✅ OpenAI response:', responseText);

      // ✅ 클라이언트로 응답 전송
      socket.emit("scenario response", { response: responseText });
    } catch (error) {
      console.error("❌ Error during scenarioPrompting:", error);

      // ✅ 에러 핸들링
      socket.emit("scenario response", {
        error: "An error occurred while contacting the OpenAI API.",
        details: error.message, // 디버깅을 위해 오류 메시지 포함
      });
    }
  });

  socket.on("generateImage", async ({ step1Text, step2Text, step3Text }) => {
    console.log('📤 Client sent image prompts:', { step1Text, step2Text, step3Text });

    if (!step1Text || !step2Text || !step3Text) {
      console.error('❌ Missing step data from client');
      return socket.emit('image response', {
        error: 'Missing step data from client.'
      });
    }

    try {
      // ✅ 프롬프트 배열 준비
      const steps = [step1Text, step2Text, step3Text];
      const imageUrls = [];

      for (let i = 0; i < steps.length; i++) {
        const imageInputText = "넌 유능한 서비스 디자이너야. 제공된 시나리오에 해당하는 사진을 출력해줘. 텍스트에 해당하는 하나의 장면을 포착한다는 느낌으로 출력해줘. User, Interactions & Touchpoints, Context & Environment가 잘 녹아들어야 해. A photorealistic image, ultra-detailed."
          + "\n 시나리오: " + steps[i];

        console.log(`📤 Generating image for Step ${i + 1}:`, imageInputText);

        // ✅ OpenAI DALL-E API 호출
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: imageInputText,
          n: 1,
          size: "1024x1024",
        });

        // ✅ 이미지 URL 추출
        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
          throw new Error(`Failed to retrieve image URL for Step ${i + 1}`);
        }

        console.log(`✅ Image URL for Step ${i + 1}:`, imageUrl);

        imageUrls.push({ step: i + 1, imageUrl });
      }

      // ✅ 클라이언트로 이미지 URL 목록 전송
      socket.emit("image response", { imageUrls });
    } catch (error) {
      console.error("❌ Error during image generation:", error);

      // ✅ 에러 핸들링
      socket.emit("image response", {
        error: "An error occurred while generating the images.",
        details: error.message,
      });
    }
  });

  // 클라이언트 연결 해제 시 처리
  socket.on("disconnect", () => {
    console.log(`Client disconnected`);
  });
});

// 서버 시작
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);

});