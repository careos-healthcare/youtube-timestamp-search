#!/usr/bin/env python3
"""Merge curated programming + AI podcast videos into lib/seed-channel-catalog.ts."""

from __future__ import annotations

import csv
import glob
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "lib" / "seed-channel-catalog.ts"

# slug, video_id, topic, priority (1=high)
EXPANSION: list[tuple[str, str, str, int]] = [
    # freeCodeCamp — full courses & certifications
    ("freecodecamp", "jS4aFq5-91M", "javascript-full-course", 1),
    ("freecodecamp", "eWRfhZUzrAc", "python-beginners", 1),
    ("freecodecamp", "8DvywoWv6fI", "python-for-everybody", 1),
    ("freecodecamp", "jH85McHenvw", "python-types", 1),
    ("freecodecamp", "RGOj5yH7evk", "git-github", 1),
    ("freecodecamp", "kqtD5dpn9C8", "python-scrimba", 1),
    ("freecodecamp", "Oe421EPjeBE", "flutter-full-course", 1),
    ("freecodecamp", "SqcY0GlETPk", "react-full-course", 1),
    ("freecodecamp", "qz0aGYrrlhU", "html-css-javascript", 1),
    ("freecodecamp", "wN0x9eZLix4", "data-structures-algorithms-python", 1),
    ("freecodecamp", "eIrMbAQSU34", "java-full-course", 1),
    ("freecodecamp", "c4OyfL5o7DU", "nodejs-full-course", 1),
    ("freecodecamp", "09_LlHjoEiY", "react-native", 1),
    ("freecodecamp", "TlB_eWDSMt4", "nodejs-tutorial", 1),
    ("freecodecamp", "zJSY8tbf_ys", "flask-python", 1),
    ("freecodecamp", "HXV3zeQKqGY", "sql-fundamentals", 1),
    ("freecodecamp", "fis26HvvDII", "angular-full-course", 1),
    ("freecodecamp", "4UZrsTqkcW4", "backend-development", 1),
    ("freecodecamp", "ua-CiDNNj30", "backend-python", 1),
    ("freecodecamp", "1PnVor36_40", "devops-ci-cd", 1),
    ("freecodecamp", "1WmNXEVia8I", "algorithms-python", 1),
    ("freecodecamp", "8hly31xKli0", "express-mongodb", 1),
    ("freecodecamp", "8aGhZQkoFbQ", "javascript-event-loop", 1),
    ("freecodecamp", "x0uinJvhNxI", "bootstrap-4", 2),
    ("freecodecamp", "M7lc1UVf-VE", "html5-css3", 1),
    ("freecodecamp", "Wf2eSG3owoA", "docker-kubernetes", 1),
    ("freecodecamp", "kTp5xUtcalw", "docker-kubernetes-hands-on", 1),
    ("freecodecamp", "d6WC5n9G_sM", "kubernetes-beginners", 1),
    ("freecodecamp", "_4uQI4ihGVU", "kubernetes-deep-dive", 1),
    ("freecodecamp", "fqMOX6JJhGo", "docker-devops", 1),
    ("freecodecamp", "7HKot-brXFE", "aws-cloud-practitioner", 1),
    ("freecodecamp", "4m9j6hlbf4g", "it-fundamentals", 1),
    ("freecodecamp", "C842vFY5kRo", "system-design", 1),
    ("freecodecamp", "CcrC5zSv1iA", "llm-fine-tuning", 1),
    ("freecodecamp", "BiA08jfr4RU", "web-dev-projects", 1),
    ("freecodecamp", "SqQUQHdYWyc", "cuda-programming", 2),
    ("freecodecamp", "uHNOqKdqQas", "jenkins-devops", 2),
    ("freecodecamp", "tVskbekONlw", "mlops-mlflow", 1),
    ("freecodecamp", "R8h_gpSpEVU", "deploying-ai-models", 1),
    ("freecodecamp", "gh2_PhgZGsM", "claude-code", 1),
    ("freecodecamp", "XKOR4h3CrwE", "gemini-cli", 2),
    ("freecodecamp", "WG5PJ8nFjv0", "neural-networks", 1),
    ("freecodecamp", "gfDE2a9MXdw", "tensorflow", 1),
    ("freecodecamp", "tPYj3fFJGjk", "transformers", 1),
    ("freecodecamp", "7eh4dLRsPhM", "data-science", 1),
    ("freecodecamp", "tx7uPw278zw", "bootstrap-5", 1),
    ("freecodecamp", "NWONeJKn6kc", "machine-learning-python", 1),
    ("freecodecamp", "VmQ4qUJKdNA", "algorithms", 1),
    ("freecodecamp", "i6OiDI95OCQ", "docker", 1),
    ("freecodecamp", "D72ZrfSyIFs", "javascript-projects", 1),
    ("freecodecamp", "qxMowoLG1nU", "machine-learning", 1),
    ("freecodecamp", "tqv0I8qd0HI", "pytorch", 1),
    ("freecodecamp", "0FTFbBgXWKU", "apache-spark", 2),
    ("freecodecamp", "9kHcLRAhXZY", "kafka", 2),
    ("freecodecamp", "5eSolROwW8E", "r-programming", 2),
    ("freecodecamp", "30lx5KP8GLg", "typescript", 1),
    ("freecodecamp", "BwuLxPH8IDs", "typescript-course", 1),
    ("freecodecamp", "0ik6l4pCcJA", "tailwind-css", 1),
    ("freecodecamp", "xW7hn3LCvic", "javascript-algorithms", 1),
    ("freecodecamp", "-leIp449qXA", "automation-zapier", 2),
    # Traversy Media
    ("traversy-media", "32M1al-Y6Ag", "nodejs-crash-course-2024", 1),
    ("traversy-media", "LDB4uaJ87e0", "react-crash-course-2024", 1),
    ("traversy-media", "SBvmnHTQIPY", "nodejs-mongodb-oauth", 1),
    ("traversy-media", "-0exw-9YJBo", "mern-express-api", 1),
    ("traversy-media", "fBNz5xF-Kx4", "nodejs-crash-course", 1),
    ("traversy-media", "Oive66jrwBs", "mern-social-network", 1),
    ("traversy-media", "3aGSqasVPsI", "tailwind-crash", 1),
    ("traversy-media", "UB1O30fR-EE", "html-css-crash", 1),
    ("traversy-media", "1uFY60CESlM", "vanilla-javascript", 1),
    ("traversy-media", "5fb2aPlgoys", "django-crash", 1),
    ("traversy-media", "8TMQcRcBnW8", "fastapi-crash", 1),
    ("traversy-media", "XCifkDC0yXA", "react-native-crash", 1),
    ("traversy-media", "G1Nr6N0Figk", "flask-python", 1),
    ("traversy-media", "7lCZCPAK5Yc", "django-blog", 1),
    ("traversy-media", "NgaypNQ0DWg", "php-mvc", 2),
    ("traversy-media", "qlED1bFJ7f4", "laravel", 1),
    ("traversy-media", "TwGRAbFBoqk", "angular-crash", 1),
    ("traversy-media", "BN_w0ujrnKy", "graphql", 1),
    ("traversy-media", "m_u6P5k0vP0", "nextjs-14", 1),
    ("traversy-media", "tN6oJu2DqCM", "react-context", 2),
    ("traversy-media", "DwGYhESO13M", "http-crash", 2),
  # Corey Schafer
    ("corey-schafer", "Z1RJmh_OqeA", "flask-tutorial", 1),
    ("corey-schafer", "iukOehU5aF4", "fastapi", 1),
    ("corey-schafer", "TEb0Zc0b10U", "matplotlib", 2),
    ("corey-schafer", "uixAmdJatXc", "argparse", 2),
    ("corey-schafer", "eKqGTln-PuY", "virtual-environments", 2),
    ("corey-schafer", "t8pYpRWdspE", "docker", 2),
    ("corey-schafer", "JIf9COiNlqc", "git", 2),
    ("corey-schafer", "e41ZvEdHxj0", "sqlalchemy", 2),
    ("corey-schafer", "3c8zFpEsvsY", "context-managers", 2),
    ("corey-schafer", "KlBPCzcQyl8", "logging", 2),
    ("corey-schafer", "ve2pmmVJ2n0", "regex", 2),
    ("corey-schafer", "NI26aqiae_E", "beautifulsoup", 2),
    ("corey-schafer", "rq8cLfkQxOg", "file-io", 2),
    ("corey-schafer", "6iIsz1AYnK8", "csv-json", 2),
    # The Net Ninja
    ("the-net-ninja", "j942wKiXFu8", "react-series", 1),
    ("the-net-ninja", "iWOYAxlnaww", "modern-javascript", 1),
    ("the-net-ninja", "hu-q2zYwEYs", "html-css-series", 1),
    ("the-net-ninja", "wqjNeSTu7ik", "react-hooks", 1),
    ("the-net-ninja", "OxTGwZ5l5J8", "firebase", 1),
    ("the-net-ninja", "KnHAuw2VIxY", "nextjs", 1),
    ("the-net-ninja", "o3PtCE0wyvw", "supabase", 1),
    ("the-net-ninja", "xiHn38lqKU4", "flutter", 2),
    ("the-net-ninja", "jR4fDIATj8E", "vue-3", 1),
    ("the-net-ninja", "q8cf5nhihZU", "graphql", 2),
    ("the-net-ninja", "6Xx2kSEusjU", "node-express", 1),
    ("the-net-ninja", "ZBK3K9rKqa8", "mongodb", 1),
    ("the-net-ninja", "y285yddQJ5Q", "typescript", 1),
    ("the-net-ninja", "QQ3k0Xn9Y9Q", "react-redux", 2),
    # MIT OCW
    ("mit-opencourseware", "ZA-tUyM_y7s", "6-006-algorithms", 1),
    ("mit-opencourseware", "CHhwJjR0mZA", "6-006-dynamic-arrays", 1),
    ("mit-opencourseware", "OQ5jsbhAv_M", "6-006-divide-conquer", 1),
    ("mit-opencourseware", "HtSuA80QTyo", "6-006-peak-finding", 1),
    ("mit-opencourseware", "C1lhuz6pZC0", "6-006-sorting", 1),
    ("mit-opencourseware", "IPSaG9RRc-k", "6-006-problem-session", 1),
    ("mit-opencourseware", "J7vHQiTn88Q", "18-06-linear-algebra", 1),
    ("mit-opencourseware", "QkxuFQkm8Eo", "18-06-elimination", 1),
    ("mit-opencourseware", "lhyC6h08jVI", "18-06-multiplication", 1),
    ("mit-opencourseware", "rGldnwTlwfU", "18-06-factorization", 1),
    ("mit-opencourseware", "c2xH2zU99b4", "18-06-transposes", 1),
    # Harvard CS50
    ("harvard-cs50", "cwtpLIWylAw", "lecture-1-c-2024", 1),
    ("harvard-cs50", "jZzyERW7h1A", "lecture-3-algorithms", 1),
    ("harvard-cs50", "0euvEdPwQnQ", "lecture-5-data-structures", 1),
    ("harvard-cs50", "EHi0RDZ31VA", "lecture-6-python", 1),
    ("harvard-cs50", "89cbCbWrM4U", "lecture-1-c-2025", 1),
    ("harvard-cs50", "zYOMDD4v8-U", "lecture-2-c-2024", 1),
    ("harvard-cs50", "1WfOAfxZSL8", "lecture-4-memory", 1),
    ("harvard-cs50", "iBB4Gwa2vNU", "lecture-7-python", 1),
    ("harvard-cs50", "9TycLR0QuqI", "lecture-8-python", 1),
    ("harvard-cs50", "9bZkp7q19f0", "lecture-9-flask", 1),
    # Google Developers
    ("google-developers", "jGwOUGg-jCw", "tensorflow-ml-crash", 1),
    ("google-developers", "3dojXA_ihKk", "machine-learning-intro", 1),
    ("google-developers", "nQS_jrD8Hsk", "kotlin-android", 1),
    ("google-developers", "7KPVp7hIGfc", "google-cloud-essentials", 2),
    ("google-developers", "Gjnup-Puqu0", "firebase-web", 2),
    ("google-developers", "lTTajzrSkBw", "chrome-devtools", 2),
    # Programming with Mosh
    ("programming-with-mosh", "mU6anWqZJcc", "responsive-web-design", 1),
    ("programming-with-mosh", "8hly31xKli0", "express-mongodb", 1),
    ("programming-with-mosh", "PkZNo7MFNFg", "javascript-full", 1),
    ("programming-with-mosh", "Rf-sc-brCQ4", "react-native", 2),
    ("programming-with-mosh", "1PnVor36_40", "devops", 2),
    # Sentdex
    ("sentdex", "eE5UswtOIfU", "machine-learning-python", 1),
    ("sentdex", "OGxgnH8y2GQ", "neural-networks-python", 1),
    ("sentdex", "vI3MHF9ZYpQ", "tensorflow-python", 1),
    ("sentdex", "wQ8BIBpyS2g", "matplotlib", 2),
    ("sentdex", "Z78IQMbkWqU", "pandas", 2),
    # Lex Fridman — AI / tech interviews
    ("lex-fridman", "0jspaMLxBig", "andrew-ng", 1),
    ("lex-fridman", "vif8NQcjVf0", "jensen-huang", 1),
    ("lex-fridman", "-HzgcbRXUK8", "demis-hassabis", 1),
    ("lex-fridman", "EV7WhVT270Q", "state-of-ai-2026", 1),
    ("lex-fridman", "YFjfBk8HI5o", "openclaw-ai-agent", 1),
    ("lex-fridman", "HsLgZzgpz9Y", "dave-plummer", 1),
    ("lex-fridman", "vagyIcmIGOQ", "dhh-programming", 1),
    ("lex-fridman", "HUkBz-cdB-k", "terence-tao", 1),
    ("lex-fridman", "9V6tWC4CdFQ", "sundar-pichai", 1),
    ("lex-fridman", "5t1vTLU7s40", "guido-van-rossum", 1),
    ("lex-fridman", "mC43pZkpTec", "dario-amodei", 1),
    ("lex-fridman", "cdiD-9MMpb0", "andrej-karpathy", 1),
    ("lex-fridman", "Kbk9BiPhm7o", "elon-musk-neuralink", 1),
    ("lex-fridman", "U5OD8MjYnOM", "yann-lecun-2", 1),
    ("lex-fridman", "Qp0rCU49lMs", "michael-levin", 1),
    ("lex-fridman", "NNr6gPelJ3E", "roman-yampolskiy", 1),
    ("lex-fridman", "_1f-o0nqpEI", "deepseek-openai-nvidia", 1),
    ("lex-fridman", "OHWnPOKh_S0", "marc-andreessen", 1),
    ("lex-fridman", "e-gwvmhyU7A", "aravind-srinivas", 1),
    ("lex-fridman", "F3Jd9GI6XqE", "edward-gibson", 1),
    ("lex-fridman", "N1e7oyT0eVg", "sam-altman-programming", 1),
    ("lex-fridman", "ffp4lu70fqQ", "david-deutsch", 1),
    ("lex-fridman", "xBrNBfxVe8I", "paul-graham", 1),
    ("lex-fridman", "SiHqnKFa5D4", "sergey-brin", 1),
    ("lex-fridman", "rY-RP3u2tV8", "jim-keller", 1),
    ("lex-fridman", "X9-nz8LWXFA", "frank-wilczek", 2),
    ("lex-fridman", "jdjb-8h0acE", "robert-playter-2", 2),
    ("lex-fridman", "zNkpwfeZBC4", "dennis-ritchie-legacy", 2),
    ("lex-fridman", "8n_Cq8QdKUM", "bjarne-stroustrup", 1),
    ("lex-fridman", "ORrWHULx4Lk", "graham-hancock", 3),
    ("lex-fridman", "ZIYn6ABQtXA", "roger-rees", 3),
    ("lex-fridman", "GF0IPbRtO8k", "jimmy-wales", 2),
    ("lex-fridman", "1X0QPk2Jkn4", "lee-cronin", 2),
    ("lex-fridman", "y3jYVe1RGaM", "joscha-bach-2", 1),
    ("lex-fridman", "QVHeOGCs5sY", "max-tegmark-2", 1),
    ("lex-fridman", "pNZWXmjv7P4", "craig-venter", 2),
    # Dwarkesh Patel
    ("dwarkesh-patel", "2PXHZqv2-qc", "ai-scaling-alignment", 1),
    ("dwarkesh-patel", "bc6uFV9CJGg", "mark-zuckerberg-llama", 1),
    ("dwarkesh-patel", "aR20FWCCjAs", "ilya-sutskever", 1),
    ("dwarkesh-patel", "n1E9IZfvGMA", "dario-amodei-exponential", 1),
    ("dwarkesh-patel", "Hrbq66XqtCo", "jensen-huang-moat", 1),
    ("dwarkesh-patel", "xmkSf5IS-zw", "how-llms-trained", 1),
    ("dwarkesh-patel", "21EYKqUsPfg", "richard-sutton", 1),
    ("dwarkesh-patel", "8-boBsWcr5A", "satya-nadella", 1),
    ("dwarkesh-patel", "BYXbuik3dgA", "elon-musk-space", 1),
    ("dwarkesh-patel", "_9V_Hbe-N1A", "adam-marblestone", 1),
    ("dwarkesh-patel", "Q8Fkpi18QXU", "terence-tao", 1),
    ("dwarkesh-patel", "48pxVdmkMIE", "sergey-levine", 1),
    ("dwarkesh-patel", "3cDHx2_QbPE", "china-energy-agi", 1),
    ("dwarkesh-patel", "mDG_Hx3BSUE", "dylan-patel-compute", 1),
    ("dwarkesh-patel", "myP8UjAM1pk", "michael-nielsen", 1),
    # Stanford Online — ML / NLP / CV
    ("stanford-online", "rmVRLeJRkl4", "cs224n-lecture-1", 1),
    ("stanford-online", "6g4O5UOH304", "cs229-logistic-regression", 1),
    ("stanford-online", "h0e2HAPTGF4", "cs229-naive-bayes", 1),
    ("stanford-online", "TjZBTDzGeGg", "cs229-policy-gradient", 1),
    ("stanford-online", "vT1JzLTH4G4", "cs231n-cnn-intro", 1),
    ("stanford-online", "j3N6eRt7SPs", "cs231n-backprop", 1),
    ("stanford-online", "dXEbbbQ51eA", "cs231n-neural-nets", 1),
    ("stanford-online", "AwHTNEJ81rI", "cs231n-cnn-architectures", 1),
    ("stanford-online", "8dGs36Fo_WE", "cs224n-word2vec", 1),
    ("stanford-online", "9vM4p9NN0Ts", "cs224n-glove", 1),
    ("stanford-online", "nFTQ7k7U4xU", "cs224n-rnn", 1),
    ("stanford-online", "BJjjOWqGXPs", "cs224n-seq2seq", 1),
    ("stanford-online", "PYHFIZU9sEs", "cs330-deep-rl", 1),
    ("stanford-online", "4Bdc55j80l8", "cs229-svm", 1),
    ("stanford-online", "ktxecZ3JkO0", "cs229-kernel-methods", 1),
    # Yannic Kilcher
    ("yannic-kilcher", "eyxmSmjmNS0", "gan-paper", 1),
    ("yannic-kilcher", "TrdevFK_am4", "vit-paper", 1),
    ("yannic-kilcher", "jE9jAZC42NE", "rnns-paper", 1),
    ("yannic-kilcher", "iDulhoQ2pro", "bert-paper", 1),
    ("yannic-kilcher", "zjkBMFhNj_g", "gpt3-paper", 1),
    ("yannic-kilcher", "9uw3F6rndnA", "clip-paper", 1),
    ("yannic-kilcher", "bZQun8Y4L2A", "rlhf-paper", 1),
    ("yannic-kilcher", "9zKuYvjFFS8", "gpt4-system-card", 1),
    ("yannic-kilcher", "9-Jl0dxWQs8", "mamba-paper", 1),
    ("yannic-kilcher", "bAWV_yrqx4w", "grpo-deepseekmath", 1),
    ("yannic-kilcher", "hpC4qjWu_aY", "context-rot", 1),
    ("yannic-kilcher", "RAEy3JZmIaA", "energy-based-transformers", 1),
    ("yannic-kilcher", "V71AJoYAtBQ", "biology-of-llm", 1),
    ("yannic-kilcher", "AfAmwIP2ntY", "test-time-compute", 1),
    ("yannic-kilcher", "B45FlSQ8ITo", "matmul-free-lm", 1),
    ("yannic-kilcher", "7NNxK3CqaDk", "flow-matching", 1),
    ("yannic-kilcher", "loaTGpqfctI", "byte-latent-transformer", 1),
    ("yannic-kilcher", "gfU5y7qCxF0", "tokenformer", 1),
    ("yannic-kilcher", "Bs6eyNQjGpo", "gsm-symbolic", 1),
    ("yannic-kilcher", "WwbukAcMM4k", "privacy-backdoors", 1),
    ("yannic-kilcher", "-r0XPC7TLzY", "safety-alignment", 1),
    ("yannic-kilcher", "0OaEv1a5jUM", "xlstm", 1),
    ("yannic-kilcher", "3a0_hAiFKag", "transformerfam", 1),
    ("yannic-kilcher", "52kMBrAI_IM", "orpo", 1),
    ("yannic-kilcher", "Nao16-6l6dQ", "free-transformer-vae", 1),
    ("yannic-kilcher", "PW4JiJ-WaY4", "planning-transformers", 1),
    ("yannic-kilcher", "kzB23CoZG30", "ml-news-llama-3", 2),
    ("yannic-kilcher", "dnTGn1EQqtQ", "ml-news-gtc", 2),
    ("yannic-kilcher", "5bPBbQyLI7E", "ml-news-gpt4o", 2),
    ("yannic-kilcher", "YOyr9Bhhaq0", "ml-news-elon-openai", 2),
    ("yannic-kilcher", "3nF8Z6HgSLQ", "ml-news-groq-gemma", 2),
    ("yannic-kilcher", "Kk8YhCpo1b8", "ml-news-jamba", 2),
    # DeepLearning.AI
    ("deeplearning.ai", "rmVRLeJRkl4", "cs224n-intro", 1),
    ("deeplearning.ai", "IHZwWFHWa-w", "cs229-linear-regression", 1),
    ("deeplearning.ai", "6g4O5UOH304", "cs229-logistic", 1),
    ("deeplearning.ai", "M7grwLR7w4M", "andrew-ng-ml-specialization", 1),
    ("deeplearning.ai", "jGw_UM8cfgA", "neural-networks", 1),
    # Andrej Karpathy
    ("andrej-karpathy", "lXUZvyajciY", "state-of-gpt", 1),
    ("andrej-karpathy", "zjkBMFhNj_g", "gpt-from-scratch", 1),
    ("andrej-karpathy", "PaCmpygFfXo", "micrograd", 1),
    ("andrej-karpathy", "VMj-3S1tUxc", "makemore", 1),
    ("andrej-karpathy", "9vM4p9NN0Ts", "nanoGPT", 1),
    # OpenAI
    ("openai", "jvqFAi7vkBc", "sam-altman-gpt5", 1),
    ("openai", "wbEk6mIlDMc", "devday-2024", 1),
    ("openai", "aR20FWCCjAs", "ilya-scaling", 1),
    # NVIDIA
    ("nvidia", "vif8NQcjVf0", "jensen-huang-lex", 1),
    ("nvidia", "Hrbq66XqtCo", "jensen-huang-dwarkesh", 1),
    ("nvidia", "lIjzF3T2B7Y", "gtc-keynote-ai", 1),
    ("nvidia", "ScsppLKBLkg", "generative-ai-explained", 1),
    # TWIML AI
    ("twiml-ai", "5A0qAYKxbH8", "andrew-ng-interview", 1),
    ("twiml-ai", "Q7r--DqG0lk", "yann-lecun-interview", 1),
    ("twiml-ai", "8F5QdAtUJPg", "demis-hassabis-interview", 1),
    ("twiml-ai", "0VH1LimQ4So", "ilya-sutskever-interview", 1),
    ("twiml-ai", "V1eYniV1ooM", "geoffrey-hinton-interview", 1),
    # Latent Space
    ("latent-space", "rb2oJxOZnnE", "ai-engineering-podcast", 1),
    ("latent-space", "SWfHxVAfHGk", "llm-agents", 1),
    ("latent-space", "uRu3zHnWPdg", "rag-production", 1),
    # 3Blue1Brown extras
    ("3blue1brown", "4Wrcu6BdhXg", "essence-linear-algebra", 1),
    ("3blue1brown", "kjBOesHnagY", "essence-calculus", 1),
    ("3blue1brown", "WUvTyaaNkzM", "neural-networks-chapter2", 1),
    ("3blue1brown", "Ilg3gGewQ5U", "backpropagation", 1),
    ("3blue1brown", "tIeHLJnJ6IY", "gradient-descent", 1),
    # Berkeley CS61A
    ("berkeley-cs61a", "0_LryzvBxFw", "cs61a-lecture-1", 1),
    ("berkeley-cs61a", "8m01DTjUg78", "cs61a-lecture-2", 1),
    ("berkeley-cs61a", "ENY0tbFlccY", "cs61a-lecture-3", 1),
    ("berkeley-cs61a", "HmL0E-viG4c", "cs61a-lecture-4", 1),
    ("berkeley-cs61a", "PkZNo7MFNFg", "cs61a-lecture-5", 1),
    # Android Developers
    ("android-developers", "fis26HvvDII", "jetpack-compose", 2),
    ("android-developers", "LcrTYsHHhqM", "kotlin-fundamentals", 1),
    ("android-developers", "F9UC9DY-vIU", "android-architecture", 1),
    ("android-developers", "0SJE9dYdpps", "material-design", 2),
    # Additional freeCodeCamp
    ("freecodecamp", "zBJB8zLpBNA", "linux-command-line", 1),
    ("freecodecamp", "Amq-urqMOD4", "vue-full-course", 1),
    ("freecodecamp", "iW9wy_Jct6E", "sveltekit", 1),
    ("freecodecamp", "GPv9cjHvK0M", "linux-administration", 1),
    ("freecodecamp", "Cy9BoVm6Zd4", "solidity-smart-contracts", 1),
    ("freecodecamp", "RGKpSfhZkPM", "web3-blockchain", 2),
    ("freecodecamp", "G3h2r404IV8", "ethical-hacking-2024", 1),
    ("freecodecamp", "3JJIQ32GHXs", "digital-forensics", 2),
    ("freecodecamp", "Po8zNc7ju_0", "astro-framework", 1),
    ("freecodecamp", "R9SmhmQ6Ue0", "html-css-design", 1),
    ("freecodecamp", "AAoeSIQIR2w", "bootstrap-portfolio", 2),
    ("freecodecamp", "ScKCyC7ISrk", "sass-scss", 2),
    ("freecodecamp", "8DvyzeWtfqM", "dart-programming", 2),
    ("freecodecamp", "VFuotXOk8_Q", "julia-programming", 3),
    ("freecodecamp", "7CqJlxBYj-M", "perl-programming", 3),
    ("freecodecamp", "qCRNB1z1ErM", "lua-programming", 3),
    # Additional Lex Fridman — tech / science
    ("lex-fridman", "13CZPWmke6A", "donald-knuth-2", 1),
    ("lex-fridman", "acoSnDXUtIE", "robert-playter-boston-dynamics", 2),
    ("lex-fridman", "wLgPk9k5DzQ", "john-carmack-2", 1),
    ("lex-fridman", "t06RUxP5_cU", "roger-penrose-2", 2),
    ("lex-fridman", "MoPdEDu9-xI", "neuroscience-2", 2),
    ("lex-fridman", "KOwm7CTFn6c", "robotics-2", 1),
    ("lex-fridman", "GvYYFloRy0o", "jeff-dean-2", 1),
    ("lex-fridman", "QJ9-ZKhQ7uE", "geoffrey-hinton-2", 1),
    ("lex-fridman", "c3bRNN5RJ5U", "ilya-sutskever-2", 1),
    ("lex-fridman", "tYINh16Bev4", "gpt4-2", 1),
    ("lex-fridman", "W87vgxZ-uXs", "francois-chollet-2", 1),
    ("lex-fridman", "MV5vvr8cfNw", "pieter-abbeel-2", 1),
    ("lex-fridman", "3t25w27BvdE", "stephen-wolfram-2", 1),
    ("lex-fridman", "nzfMk4LBRmQ", "turing-award-2", 1),
    ("lex-fridman", "vjMqTEbi9Vo", "nvidia-2", 1),
    ("lex-fridman", "mC43CHIhjTQ", "andrew-ng-2", 1),
    # Additional Stanford / Berkeley
    ("stanford-online", "ptuGllU5SQQ", "cs224n-overview", 1),
    ("stanford-online", "noQEvlHAUAE", "cs224n-word-vectors", 1),
    ("stanford-online", "iWONvLMUE7E", "cs231n-overview", 1),
    ("stanford-online", "FScyHcZLVR8", "cs25-transformers", 1),
    ("stanford-online", "4Xfi23Yfn-U", "cs229-intro", 1),
    ("berkeley-cs61a", "q6iqI2GIllI", "cs61a-higher-order", 1),
    ("berkeley-cs61a", "x4sQkFYW0-0", "cs61a-recursion", 1),
    ("berkeley-cs61a", "Lgy92S0xXC4", "cs61a-trees", 1),
    # IBM / MongoDB / Redis education
    ("ibm-technology", "Ok-xpKjKp2g", "kubernetes-explained", 1),
    ("ibm-technology", "1xo-0-kc2EI", "microservices-explained", 1),
    ("ibm-technology", "kv1MXVZ3890", "blockchain-explained", 2),
    ("ibm-technology", "yubzJw0uiE4", "ai-explained", 1),
    ("mongodb-university", "Www6koajkGw", "mongodb-basics", 1),
    ("mongodb-university", "ofme2EUyX8w", "mongodb-aggregation", 2),
    # More Traversy
    ("traversy-media", "w7ejDZ8SWv8", "react-redux-2024", 1),
    ("traversy-media", "Ke90YMEj5kY", "mongodb-atlas", 2),
    ("traversy-media", "4UZrsTqkcTI", "nextjs-13", 1),
    # More Corey Schafer
    ("corey-schafer", "v3NHysI4l8k", "multiprocessing", 2),
    ("corey-schafer", "W8KRzm-HUcc", "threading", 2),
    ("corey-schafer", "nhBVL41-_W4", "itertools", 2),
    ("corey-schafer", "K5KVE_wzCgk", "functools", 2),
    # More Yannic Kilcher
    ("yannic-kilcher", "CDiqA4SJNpA", "alphacode-paper", 1),
    ("yannic-kilcher", "kCc8FmEb1nY", "chatgpt-architecture", 1),
    # More Dwarkesh
    ("dwarkesh-patel", "V979WdHSqO8", "dario-amodei-2", 1),
    ("dwarkesh-patel", "tOtdJkpV2Vw", "dario-amodei-3", 1),
    ("dwarkesh-patel", "is-O3mKdYFw", "patrick-collison-2", 1),
    ("dwarkesh-patel", "7gKJKHfqejA", "ai-safety-2", 1),
    ("dwarkesh-patel", "nis745H7YRc", "scaling-laws-2", 1),
    # More MIT
    ("mit-opencourseware", "70bSF1MN8fk", "6-0001-python", 1),
    ("mit-opencourseware", "nBuS-WjidY8", "18-06-gaussian-elimination", 1),
    ("mit-opencourseware", "W5J5JHal5-c", "6-006-bfs-dfs", 1),
    # More sentdex
    ("sentdex", "OGxgnH8y2GQ", "deep-learning-basics", 1),
    ("sentdex", "vI3MHF9ZYpQ", "tensorflow-2", 1),
    # More TWIML
    ("twiml-ai", "u6XAPnuFjJc", "sam-altman-interview", 1),
    ("twiml-ai", "Gfr50K6cVaY", "fei-fei-li-interview", 1),
    ("twiml-ai", "nFTQ7k7U4xU", "richard-socher-interview", 1),
    ("freecodecamp", "uQcTS7A-qGA", "deno-runtime", 2),
]

CHANNEL_META: dict[str, tuple[str, str]] = {
    "freecodecamp": ("freeCodeCamp", "programming tutorials"),
    "traversy-media": ("Traversy Media", "programming tutorials"),
    "corey-schafer": ("Corey Schafer", "programming tutorials"),
    "the-net-ninja": ("The Net Ninja", "programming tutorials"),
    "mit-opencourseware": ("MIT OpenCourseWare", "programming tutorials"),
    "harvard-cs50": ("Harvard CS50", "programming tutorials"),
    "google-developers": ("Google Developers", "programming tutorials"),
    "programming-with-mosh": ("Programming with Mosh", "programming tutorials"),
    "sentdex": ("sentdex", "programming tutorials"),
    "3blue1brown": ("3Blue1Brown", "programming tutorials"),
    "berkeley-cs61a": ("Berkeley CS61A", "programming tutorials"),
    "android-developers": ("Android Developers", "programming tutorials"),
    "ibm-technology": ("IBM Technology", "programming tutorials"),
    "mongodb-university": ("MongoDB University", "programming tutorials"),
    "lex-fridman": ("Lex Fridman", "AI podcasts"),
    "dwarkesh-patel": ("Dwarkesh Patel", "AI podcasts"),
    "stanford-online": ("Stanford Online", "AI podcasts"),
    "yannic-kilcher": ("Yannic Kilcher", "AI podcasts"),
    "deeplearning.ai": ("DeepLearning.AI", "AI podcasts"),
    "andrej-karpathy": ("Andrej Karpathy", "AI podcasts"),
    "openai": ("OpenAI", "AI podcasts"),
    "nvidia": ("NVIDIA", "AI podcasts"),
    "twiml-ai": ("TWIML AI", "AI podcasts"),
    "latent-space": ("Latent Space", "AI podcasts"),
}

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def load_excluded_ids() -> set[str]:
    excluded: set[str] = set()
    catalog = CATALOG_PATH.read_text()
    excluded.update(re.findall(r'videoId:\s*"([A-Za-z0-9_-]{11})"', catalog))
    for path in glob.glob(str(ROOT / "data" / "*.csv")):
        with open(path, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                vid = (row.get("video_id") or "").strip()
                if VIDEO_ID_RE.match(vid):
                    excluded.add(vid)
    return excluded


def parse_catalog_channels(text: str) -> list[dict]:
    """Parse existing catalog into channel dicts preserving order."""
    channels: list[dict] = []
    # Split on channel object starts
    pattern = re.compile(
        r'\{\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*videos:\s*\[(.*?)\]\s*,?\s*\}',
        re.DOTALL,
    )
    for m in pattern.finditer(text):
        slug, name, category, videos_block = m.groups()
        videos = []
        for vm in re.finditer(
            r'\{\s*videoId:\s*"([^"]+)",\s*topic:\s*"([^"]+)",\s*priority:\s*(\d+)\s*\}',
            videos_block,
        ):
            videos.append(
                {"videoId": vm.group(1), "topic": vm.group(2), "priority": int(vm.group(3))}
            )
        channels.append({"slug": slug, "name": name, "category": category, "videos": videos})
    return channels


def channel_key(ch: dict) -> tuple[str, str]:
    return (ch["slug"], ch["category"])


def format_video(v: dict) -> str:
    return f'      {{ videoId: "{v["videoId"]}", topic: "{v["topic"]}", priority: {v["priority"]} }}'


def format_channel(ch: dict) -> str:
    lines = [
        "  {",
        f'    slug: "{ch["slug"]}",',
        f'    name: "{ch["name"]}",',
        f'    category: "{ch["category"]}",',
        "    videos: [",
    ]
    for v in ch["videos"]:
        lines.append(format_video(v) + ",")
    if ch["videos"]:
        lines[-1] = lines[-1].rstrip(",")
    lines.append("    ],")
    lines.append("  },")
    return "\n".join(lines)


def main() -> None:
    excluded = load_excluded_ids()
    text = CATALOG_PATH.read_text()
    channels = parse_catalog_channels(text)
    index = {channel_key(ch): ch for ch in channels}

    added = 0
    skipped_dup = 0
    skipped_invalid = 0

    for slug, video_id, topic, priority in EXPANSION:
        if not VIDEO_ID_RE.match(video_id):
            skipped_invalid += 1
            continue
        if video_id in excluded:
            skipped_dup += 1
            continue

        meta = CHANNEL_META.get(slug)
        if not meta:
            raise SystemExit(f"Unknown slug: {slug}")
        name, category = meta
        key = (slug, category)
        if key not in index:
            index[key] = {"slug": slug, "name": name, "category": category, "videos": []}
            channels.append(index[key])

        ch = index[key]
        ch["videos"].append({"videoId": video_id, "topic": topic, "priority": priority})
        excluded.add(video_id)
        added += 1

    header = text.split("export const SEED_CHANNEL_CATALOG")[0]
    footer_match = re.search(
        r"(export const SEED_CHANNEL_CATEGORIES.*)$", text, re.DOTALL
    )
    footer = footer_match.group(1) if footer_match else ""

    body = "export const SEED_CHANNEL_CATALOG: SeedChannel[] = [\n"
    body += "\n".join(format_channel(ch) for ch in channels)
    body += "\n];\n\n"

    # Recompute categories export
    cats = sorted({ch["category"] for ch in channels})
    footer = (
        "export const SEED_CHANNEL_CATEGORIES = "
        + "[...new Set(SEED_CHANNEL_CATALOG.map((channel) => channel.category))];"
    )

    CATALOG_PATH.write_text(header + body + footer + "\n")

    prog_ai = sum(
        len(ch["videos"])
        for ch in channels
        if ch["category"] in ("programming tutorials", "AI podcasts")
    )
    print(f"Added {added} new videos (skipped {skipped_dup} duplicates, {skipped_invalid} invalid)")
    print(f"Programming + AI videos in catalog: {prog_ai}")
    print(f"Total channels: {len(channels)}")


if __name__ == "__main__":
    main()
