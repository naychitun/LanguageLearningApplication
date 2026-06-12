// JSONファイルを読み込み、画面を初期化する
let data = {
  words: [],
  quiz: []
};

async function loadData() {
  try {
    const response = await fetch("./data.json");

    if (!response.ok) {
      throw new Error("JSONの読み込み失敗");
    }

    data = await response.json();

    // ✅安全対策（ここが重要）
    data.words = data.words || [];
    data.quiz = data.quiz || [];

    // ✅初期化はここ（安全になってから）
    updateLevelDisplay();

    generateQuiz();
    renderStats();
    renderWords();
    renderQuizQuestion();

  } catch (error) {
    console.error("JSON読み込みエラー", error);
    alert("データの読み込みに失敗しました");
  }
}


// =======================
// 学習状態
// =======================

let studied = false;              // 学習済みか
let studyStartTime = null;        // 学習開始時刻 
let totalStudyMinutes = 0;         // 学習時間
let streakDays = 0;                  // 連続学習日数
// レベル情報
let currentLevel = 1;
let nextLevel = 2;
// クイズ成績
let accuracy = 0;
let favoriteWords = [];
let studyHistory = [
  { date: "Mon",value: 0 , vocab: 0, time: 0, accuracy: 0 },
  { date: "Tue",value: 0 , vocab: 0, time: 0, accuracy: 0 },
  { date: "Wed",value: 0 , vocab: 0, time: 0, accuracy: 0 },
  { date: "Thu",value: 0 , vocab: 0, time: 0, accuracy: 0 },
  { date: "Fri",value: 0 , vocab: 0, time: 0, accuracy: 0 },
  { date: "Sat",value: 0 ,vocab: 0, time: 0, accuracy: 0 },
  { date: "Sun",value: 0 , vocab: 0, time: 0, accuracy: 0 }
];

// =======================
// タブ画面の切り替え
// =======================


// タブ切り替え処理
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

     // 全タブを非アクティブ化
    tabButtons.forEach((b) => {
      b.classList.remove("active");
    });
    tabContents.forEach((c) => {
      c.classList.remove("active");
    });

     // 選択したタブを表示
    btn.classList.add("active");
    document
      .getElementById(target)
      .classList.add("active");
  });
});

// =======================
// ダッシュボード更新
// =======================

function renderStats() {
  // 学習前の表示
  if (!studied) {
    document.getElementById("vocab-count")
      .textContent = "未学習 ";
    document.getElementById("study-time")
      .textContent = "0分";
    document.getElementById("quiz-accuracy")
      .textContent = "--%";
    document.getElementById("streak")
      .textContent = "0日";
  }
  // 学習後の表示
  else {
    const hours = Math.floor(totalStudyMinutes / 60);
    const minutes = totalStudyMinutes % 60;

    document.getElementById("vocab-count")
      .textContent =learnedWords.length + "語";

    document.getElementById("study-time")
      .textContent = `${hours}時間 ${minutes}分`; 
   
    document.getElementById("quiz-accuracy")
      .textContent =accuracy + "%";
    document.getElementById("streak")
      .textContent =streakDays + "日";
  }
}
// =======================
// 学習結果表示
// =======================
function renderStudyResult() {
    
  // 学習時間・正解率
  document.getElementById("stats-time")
    .textContent = totalStudyMinutes + "分";
  document.getElementById("stats-accuracy")
    .textContent = accuracy + "%";

     // グラフ描画
  const chartArea =
    document.getElementById("chart-area");
  chartArea.innerHTML = "";
  studyHistory.forEach((day) => {

     // 1日分のデータ
    const wrapper =document.createElement("div");
    wrapper.className = "chart-day";
    const bar =document.createElement("div");
    bar.className = "bar";
    bar.style.height =day.value + "px";
    const label =document.createElement("div");
    label.className = "label";
    label.textContent = day.date;
    wrapper.appendChild(bar);
    wrapper.appendChild(label);
    chartArea.appendChild(wrapper);
  });
}



// =======================
// 単語リスト表示
// =======================

function renderWords() {

    if (!data.words || data.words.length === 0) return;

   // リスト初期化
  const recentTitle = document.getElementById("recent-title");
  const recentList = document.getElementById("recent-words");
  const vocabList = document.getElementById("vocab-list");
  recentList.innerHTML = "";
  vocabList.innerHTML = "";

   // 最近学習した単語
  if (!studied) {
    recentTitle.style.display = "none";
    recentList.style.display = "none";
  } else {
    recentTitle.style.display = "block";
    recentList.style.display = "block";
    const recent = learnedWords.slice(-4);
    recent.forEach((w) => {
      const li = createWordItem(w);
      recentList.appendChild(li);
    });
  }
   // 課ごとの表示
  const lessons = [...new Set(
  data.words.map(word => word.lesson)
  )];

  lessons.forEach(lesson => {

      // 見出し
  const lessonCard = document.createElement("div");
  lessonCard.className = "lesson-card";
  lessonCard.textContent = `📖 第${lesson}課`;

  vocabList.appendChild(lessonCard);

    // 単語リスト
  const wordContainer = document.createElement("div");
  wordContainer.className = "lesson-words hidden";

  const lessonWords =
    data.words.filter(w => w.lesson === lesson);

  lessonWords.forEach(word => {
    wordContainer.appendChild(
      createWordItem(word)
    );
  });

  vocabList.appendChild(wordContainer);

   // 開閉処理
  lessonCard.addEventListener("click", () => {
    wordContainer.classList.toggle("hidden");
  });

});
}

// DOM（まとめる）
const favoriteList = document.getElementById("favorite-list");

// action
function addFavorite(word) {
  favoriteWords.push(word);
  renderFavorites();
}

// 表示
function renderFavorites() {
  if (!favoriteList) return;

  favoriteList.innerHTML = "";

  favoriteWords.forEach(word => {
    favoriteList.appendChild(createWordItem(word));
  });
}

// =======================
// 単語アイテム作成
// =======================

function createWordItem(w) {
  // 単語表示作成
  const li =document.createElement("li");
  li.className = "word-item";
  li.innerHTML = `
    <div class="word-left">
      <div class="emoji">${w.icon}</div>
      <div class="word-text">
        <div class="jp">${w.jp}</div>
        <div class="en">${w.en}</div>
         <div class="my">${w.my}</div>
        <div class="CN">${w.zh}</div>
        <div class="NP"> ${w.ne}</div>
        <div class="BD"> ${w.bn}</div>
        <div class ="VN"> ${w.vi}</div>
      </div>
    </div>
    <div class="word-actions">
      <button class="jp-sound">🇯🇵</button>
      <button class="en-sound">🇺🇸</button>
      <button class="my-sound">🇲🇲</button>
      <button class="zh-sound">🇨🇳</button>
      <button class="ne-sound">🇳🇵</button>
      <button class="bn-sound">🇧🇩</button>
      <button class="vi-sound">🇻🇳</button>
      <button class="star-btn">⭐</button>
    </div>
  `;

  // 音声再生
  function speak(text, lang) {
  const utter =new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  speechSynthesis.speak(utter);
}

// 日本語音声
li.querySelector(".jp-sound")
  .addEventListener("click", () => {
    speak(w.jp, "ja-JP");
  });

 // 英語音声 
li.querySelector(".en-sound")
  .addEventListener("click", () => {
    speak(w.en, "en-US");
  });

 // ミャンマー語音声 
li.querySelector(".my-sound")
  .addEventListener("click", () => {
    speak(w.my, "my-MM");
  });

// 中国語音声
li.querySelector(".zh-sound")
  .addEventListener("click", () => {
    speak(w.zh, "zh-CN");
  });

// ネパール語音声
li.querySelector(".ne-sound")
  .addEventListener("click", () => {
    speak(w.ne, "ne-NP");
  });

// ベンガル語音声
li.querySelector(".bn-sound")
  .addEventListener("click", () => {
    speak(w.bn, "bn-BD");
  });

  
li.querySelector(".vi-sound")
  .addEventListener("click", () => {
    speak(w.vi, "vi-VN");
  });

    // お気に入り切り替え
  li.querySelector(".star-btn")
  .addEventListener("click", (e) => {

    e.target.classList.toggle("active");

    if (
      !favoriteWords.some(
        item => item.jp === w.jp
      )
    ) {

      favoriteWords.push(w);

    } else {

      favoriteWords =
        favoriteWords.filter(
          item => item.jp !== w.jp
        );

    }

    renderFavorites();
  });
  return li;
}
// =======================
// クイズ自動生成
// =======================

function generateQuiz() {
  data.quiz = [];

  // 現在のレベルの単語だけ取得
  const currentWords = data.words.filter(
    word => word.level === currentLevel
  );

  // 出題パターン
  const quizPatterns = [
    { from: "jp", to: "en", toName: "英語" },
    { from: "en", to: "jp", toName: "日本語" },
    { from: "jp", to: "my", toName: "ミャンマー語" },
    { from: "my", to: "jp", toName: "日本語" },
    { from: "jp", to: "zh", toName: "中国語" },
    { from: "zh", to: "jp", toName: "日本語" },
    { from: "jp", to: "vi", toName: "ベトナム語" },
    { from: "vi", to: "jp", toName: "日本語" },
    { from: "jp", to: "ne", toName: "ネパール語" },
    { from: "jp", to: "bn", toName: "バングラデシュ語"}
  ];

  // クイズ生成
  quizPatterns.forEach(pattern => {
    currentWords.forEach(word => {
      const correct = word[pattern.to];

        // 選択肢生成（正解＋ダミー3つ）
      let options = [correct];
      const others = currentWords
        .filter(w => w[pattern.to] !== correct)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      others.forEach(w => {
        options.push(w[pattern.to]);
      });

       // シャッフル
      options.sort(() => Math.random() - 0.5);
      data.quiz.push({
        question:
          `「${word[pattern.from]}」を${pattern.toName}で答えてください`,
        options: options,
        answerIndex: options.indexOf(correct),
        word: word
      });
    });
  });
  // シャッフル＆制限
  data.quiz.sort(() => Math.random() - 0.5);
  // 10問だけにする
   data.quiz = data.quiz.slice(0, 10);
}

// =======================
// クイズ処理
// =======================
// クイズ状態
let currentQuestionIndex = 0;
let score = 0;
let answered = false;
let learnedWords = [];
// DOM取得
const quizProgressEl =document.getElementById("quiz-progress");
const quizScoreEl =document.getElementById("quiz-score");
const quizQuestionEl =document.getElementById("quiz-question");
const quizOptionsEl =document.getElementById("quiz-options");
const nextQuestionBtn =document.getElementById("next-question");

// =======================
// 問題表示
// =======================

function renderQuizQuestion() {
   // 学習開始時間（未開始なら初期化）
  if (!studyStartTime) {
    studyStartTime = new Date();
  }
  const q =data.quiz[currentQuestionIndex];

   // 問題文・進捗・スコア更新
  quizQuestionEl.textContent =q.question;
  quizProgressEl.textContent =
    `問題 ${currentQuestionIndex + 1}/${data.quiz.length}`;
 quizScoreEl.textContent =
  `スコア ${score}/${data.quiz.length}`;

    // 選択肢初期化
  quizOptionsEl.innerHTML = "";
  answered = false;
  nextQuestionBtn.disabled = true;

    // 選択肢生成
  q.options.forEach((opt, idx) => {
    const btn =document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
       console.log("clicked", idx);
      handleAnswer(idx);
    });
    quizOptionsEl.appendChild(btn);
  });
    // メッセージリセット
  document.getElementById(
    "answer-message"
  ).textContent = "";
}

// =======================
// 回答処理
// =======================

function handleAnswer(selectedIndex) {
  if (answered) return;
  answered = true;
  const q =data.quiz[currentQuestionIndex];

  const currentWord = q.word;

  // 学習単語に追加（重複防止）
if (!learnedWords.some(w => w.jp === currentWord.jp)) {
  learnedWords.push(currentWord);
}

 // 正誤表示
  const optionButtons =quizOptionsEl.querySelectorAll(".quiz-option");
  optionButtons.forEach((btn, idx) => {
    if (idx === q.answerIndex) {
      btn.classList.add("correct");
    }
    else if (idx === selectedIndex) {
      btn.classList.add("wrong");
    }
  });

  const answerMessage =
  document.getElementById("answer-message");

  // スコア更新 & メッセージ
if (selectedIndex === q.answerIndex) {

  score += 1;

  answerMessage.textContent =
    `⭕ 正解です！`;

} else {

  answerMessage.textContent =
    `❌ 不正解です。正解は「${q.options[q.answerIndex]}」です`;

}
  quizScoreEl.textContent =
  `スコア ${score}/${data.quiz.length}`;
  nextQuestionBtn.disabled = false;
}

// =======================
// 次の問題
// =======================

nextQuestionBtn.addEventListener("click", () => {

  currentQuestionIndex++;

  // クイズ終了処理
  if (currentQuestionIndex >= data.quiz.length) {
     const today = new Date().getDay();
  const dayMap = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const dayName = dayMap[today];

  const index = studyHistory.findIndex(d => d.date === dayName);

 // 今日の学習データ更新
  if (index !== -1) {
    studyHistory[index].value = totalStudyMinutes;
    studyHistory[index].vocab = learnedWords.length;
    studyHistory[index].accuracy = accuracy;
  }
  renderStudyResult();

   // 学習時間計算
    const endTime = new Date();

    totalStudyMinutes =
      Math.floor(
        (endTime - studyStartTime) / 1000 / 60
      );

    if (totalStudyMinutes <= 0) {
      totalStudyMinutes = 1;
    }
 // 正答率計算
    accuracy =
      Math.floor(
        (score / data.quiz.length) * 100
      );

    studied = true;
    streakDays++;


  // stats表示
  document
    .getElementById("stats-tab")
    .classList.remove("hidden");

  document
    .getElementById("stats")
    .classList.remove("hidden");

 // レベル判定
    if (accuracy >= 60) {

      currentLevel++;
      nextLevel++;

      updateLevelDisplay();

      alert(
        `🎉 レベルアップ！\nLv.${currentLevel}になりました！`
      );

    } else {

      alert(
        `正解率${accuracy}%でした。\n60%以上でレベルアップできます。`
      );

    }
// 画面更新
    renderStats();
    renderStudyResult();
    renderWords();
 // リセット
    generateQuiz();

    currentQuestionIndex = 0;
    score = 0;
    studyStartTime = null;

    renderQuizQuestion();

    return;
  }
// 次の問題へ
  renderQuizQuestion();

});

// =======================
// テーマ切り替え
// =======================
// テーマ切り替え
const themeToggle =document.getElementById("theme-toggle");
const themeLabel =document.getElementById("theme-label");
themeToggle.addEventListener("change", () => {
  const isDark =themeToggle.checked;
  document.body.classList.toggle(
    "dark",
    isDark
  );
  document.body.classList.toggle(
    "light",
    !isDark
  );
  themeLabel.textContent =
    isDark
      ? "ダークモード"
      : "ライトモード";
});

// =======================
// レベルシステム
// =======================

const currentLevelEl =document.getElementById("currentLevel");
const nextLevelEl =document.getElementById("nextLevel");

function updateLevelDisplay() {
  currentLevelEl.textContent =`Lv.${currentLevel}`;
  nextLevelEl.textContent =`Next Lv.${nextLevel}`;
}

loadData();

