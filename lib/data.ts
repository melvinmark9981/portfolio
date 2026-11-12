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
  availability: "Seeking full-time roles from early 2027",
  currentRole: "Currently an Equipment Engineer Intern at Western Digital",
  resume: "/resume.pdf",
  photo: "/profile.jpg",
};

export const about = {
  bio: "I'm a final-year BSc Computer Science & Data Science student and AI engineer, currently working as an Equipment Engineer Intern at Western Digital. I enjoy taking machine-learning research all the way to a working, deployable product. My work spans semiconductor defect detection, industrial predictive maintenance, IoT analytics, and NLP, with a focus on models that are accurate, explainable, and genuinely useful. I care about clean engineering, real datasets, and results I can defend with numbers.\n\nI'm seeking full-time roles from early 2027 as a Data Scientist, AI/ML Engineer, Data Engineer, or DevOps Engineer in semiconductor or smart manufacturing, based in Singapore or Malacca.",
  skills: [
    "Python",
    "PyTorch",
    "Next.js",
    "SQL",
    "Streamlit",
    "React",
    "TensorFlow",
    "Plotly",
    "Three.js",
    "Apache Kafka",
    "PLC Programming",
    "Mitsubishi MX Component",
    "Digital Twin",
    "Unity",
    "Unreal Engine",
    "Predictive Maintenance",
  ],
};

export type Experience = {
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
};

// Newest first.
export const experience: Experience[] = [
  {
    role: "Equipment Engineer Intern",
    company: "Western Digital",
    location: "Pasir Gudang, Johor",
    period: "Oct 2026 – Present",
    bullets: [
      "Building a Three.js digital twin of a CMP polishing line (SpeedFam and System Seiko disk-polishing machines) so engineers and management can see machine status live on the factory floor",
      "Pulling machine data with SQL from local factory servers and streaming it into Apache Kafka",
      "Engineering features from machine parameters to predict machine failure and downtime (predictive maintenance, in progress)",
      "Working with PLC programming and Mitsubishi MX Component for machine data communication",
      "Building simulations with AI coding agents",
    ],
  },
  {
    role: "Founder & Operations Director",
    company: "Dwin Club",
    location: "Johor Bahru",
    period: "Jan 2022 – Present",
    bullets: [
      "Founded and run an event services company providing crew staffing and concert promotion for 15+ concerts across Malaysia; lead crews and on-site operations.",
    ],
  },
];

export type Project = {
  title: string;
  tech: string[];
  description: string;
  github: string;
  demo?: string;
  image?: string;
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
    demo: "https://waferdemo9981.streamlit.app/",
    image: "/screenshots/wafer.png",
    tag: "Featured · Semiconductor AI",
    featured: true,
  },
  {
    title: "Malaysia Smart City IoT Dashboard",
    tech: ["Python", "Streamlit", "Plotly"],
    description:
      "Real-time IoT sensor monitoring dashboard for 5 Malaysian cities (KL, JB, Penang, KK, Kuching) with Z-score anomaly detection and live heatmaps.",
    github: "https://github.com/melvinmark9981/malaysia-smart-city-dashboard",
    demo: "https://malaysia-smart-city-dashboard-3bdkkrjefxll5scvbkdms9.streamlit.app/",
    image: "/screenshots/smartcity.png",
    tag: "Smart City · IoT",
  },
  {
    title: "Predictive Maintenance System",
    tech: ["Python", "PyTorch", "LSTM", "SHAP", "Streamlit"],
    description:
      "End-to-end AI system predicting Remaining Useful Life (RUL) of industrial equipment using the NASA CMAPSS dataset via an LSTM deep-learning model.",
    github: "https://github.com/melvinmark9981/predictive-maintenance-cmapss",
    demo: "https://predictive-maintenance-cmapss-1.streamlit.app/",
    image: "/screenshots/maintenance.png",
    tag: "Industry 4.0 · Manufacturing",
  },
  {
    title: "5G Coverage Gap Analyser",
    tech: ["Python", "Streamlit", "Folium"],
    description:
      "Geospatial analytics dashboard identifying underserved 5G coverage areas across Peninsular Malaysia with interactive maps and state-level gap scoring.",
    github: "https://github.com/melvinmark9981/5g-coverage-gap-analyser",
    demo: "https://5g-coverage-gap-analyser-a3t273jbbeuwwfgdau3g7h.streamlit.app/",
    image: "/screenshots/5g.png",
    tag: "5G · Data Analytics",
  },
];

export const education = {
  degree: "BSc Computer Science & Data Science",
  school: "Raffles University Malaysia",
  period: "Jan 2022 – Jan 2027",
  summary:
    "Final-year undergraduate specialising in artificial intelligence, deep learning, and applied data science, with a capstone in semiconductor defect detection.",
};
