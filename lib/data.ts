// Central content for the portfolio — edit here to update the site.

export const profile = {
  name: "Melvin Mark Michael",
  title: "AI & Data Science Engineer | Final Year CS Student",
  tagline:
    "Building real-world AI systems for semiconductor manufacturing, IoT, and smart city applications",
  email: "melvinmark9981@gmail.com",
  phone: "+60196039981",
  phoneHref: "+60196039981",
  linkedin: "https://linkedin.com/in/melvinmarkmichael",
  github: "https://github.com/melvinmark9981",
  location: "Johor Bahru, Malaysia",
  availability: "Available for Professional Attachment (PA): September 2026",
  resume: "/resume.pdf",
  photo: "/profile.jpg",
};

export const about = {
  bio: `I'm a final-year BSc Computer Science & Data Science student and AI engineer who
enjoys taking machine-learning research all the way to a working, deployable product.
My work spans semiconductor defect detection, industrial predictive maintenance, IoT
analytics, and NLP — with a focus on models that are accurate, explainable, and
genuinely useful. I care about clean engineering, real datasets, and results I can
defend with numbers.`,
  skills: [
    "Python",
    "PyTorch",
    "Next.js",
    "SQL",
    "Streamlit",
    "React",
    "Hugging Face",
    "Plotly",
  ],
};

export type Project = {
  title: string;
  tech: string[];
  description: string;
  github: string;
  tag: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    title: "Wafer Map Defect Classifier",
    tech: ["Python", "PyTorch", "CNN-SE", "Streamlit"],
    description:
      "AI-powered semiconductor wafer defect classification system. Hybrid CNN with Squeeze-and-Excitation attention blocks trained on the WM811K dataset (811,457 samples, 9 defect classes). Achieved 95.74% accuracy and 83.88% Macro F1 — outperforming ResNet50 and EfficientNet-B3.",
    github: "https://github.com/melvinmark9981/wafer-defect-detection",
    tag: "Featured · Semiconductor AI",
    featured: true,
  },
  {
    title: "Malaysia Smart City IoT Dashboard",
    tech: ["Python", "Streamlit", "Plotly"],
    description:
      "Real-time IoT sensor monitoring dashboard for 5 Malaysian cities (KL, JB, Penang, KK, Kuching) with Z-score anomaly detection and live heatmaps.",
    github: "https://github.com/melvinmark9981/malaysia-smart-city-dashboard",
    tag: "Smart City · IoT",
  },
  {
    title: "Predictive Maintenance System",
    tech: ["Python", "PyTorch", "LSTM", "SHAP", "Streamlit"],
    description:
      "End-to-end AI system predicting Remaining Useful Life (RUL) of industrial equipment using the NASA CMAPSS dataset via an LSTM deep-learning model.",
    github: "https://github.com/melvinmark9981/predictive-maintenance-cmapss",
    tag: "Industry 4.0 · Manufacturing",
  },
  {
    title: "5G Coverage Gap Analyser",
    tech: ["Python", "Streamlit", "Folium"],
    description:
      "Geospatial analytics dashboard identifying underserved 5G coverage areas across Peninsular Malaysia with interactive maps and state-level gap scoring.",
    github: "https://github.com/melvinmark9981/5g-coverage-gap-analyser",
    tag: "5G · Data Analytics",
  },
  {
    title: "AI Policy Brief Generator",
    tech: ["Python", "Streamlit", "Claude API"],
    description:
      "Full-stack AI document processing app that ingests government policy documents and generates structured briefs using the Anthropic Claude API structured outputs.",
    github: "https://github.com/melvinmark9981/ai-policy-brief-generator",
    tag: "AI · NLP · Government Tech",
  },
  {
    title: "English–Spanish Neural Translation System",
    tech: ["Python", "mBART-50", "Whisper ASR", "gTTS", "Gradio"],
    description:
      "End-to-end speech-to-speech translation pipeline fine-tuned on the OPUS-100 EN-ES dataset. Achieved BLEU 27.81–28.44 — a 34% improvement over base mBART-50.",
    github: "https://github.com/melvinmark9981/NLP_Voice_Translator",
    tag: "NLP · Machine Translation",
  },
];

export const education = {
  degree: "BSc Computer Science & Data Science",
  school: "Raffles University Malaysia",
  period: "2023 – 2026",
  summary:
    "Final-year undergraduate specialising in artificial intelligence, deep learning, and applied data science, with a capstone in semiconductor defect detection.",
};
