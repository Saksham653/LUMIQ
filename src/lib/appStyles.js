// The app-wide stylesheet, injected by LumiqApp. Moved verbatim
export const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #050914; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0a0f2c; }
    ::-webkit-scrollbar-thumb { background: #1e2d5c; border-radius: 2px; }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    @keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes beam { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    .lumiq-app { min-height: 100vh; background: #050914; color: #e2e8f0; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
    .btn-primary { background: linear-gradient(135deg, #00D4FF, #0099bb); color: #050914; border: none; padding: 12px 28px; border-radius: 8px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px #00D4FF44; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-ghost { background: transparent; color: #8892b0; border: 1px solid #1e2d5c; padding: 10px 20px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; }
    .btn-ghost:hover { border-color: #00D4FF55; color: #00D4FF; background: #00D4FF0A; }
    .glass-card { background: linear-gradient(135deg, #0d1b3e15, #0a0f2c10); border: 1px solid #1e2d5c; border-radius: 16px; backdrop-filter: blur(20px); }
    .insight-card { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 12px; padding: 16px; transition: all 0.2s; animation: fadeSlide 0.4s ease both; }
    .insight-card:hover { border-color: #00D4FF44; transform: translateY(-2px); }
    .tab-btn { background: transparent; border: none; padding: 10px 20px; color: #8892b0; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab-btn.active { color: #00D4FF; border-bottom-color: #00D4FF; }
    .tab-btn:hover:not(.active) { color: #ccd6f6; }
    .oracle-input { width: 100%; background: #0a1128; border: 1px solid #1e2d5c; border-radius: 12px; padding: 14px 18px; color: #e2e8f0; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; resize: none; transition: border-color 0.2s; }
    .oracle-input:focus { border-color: #00D4FF55; }
    .oracle-input::placeholder { color: #3d4f7c; }
    .chat-bubble-user { background: linear-gradient(135deg, #00D4FF1a, #00D4FF0d); border: 1px solid #00D4FF33; border-radius: 16px 16px 4px 16px; padding: 12px 16px; font-size: 14px; color: #ccd6f6; max-width: 80%; margin-left: auto; }
    .chat-bubble-oracle { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 4px 16px 16px 16px; padding: 12px 16px; font-size: 14px; color: #e2e8f0; max-width: 85%; line-height: 1.6; }
    .streaming-cursor::after { content: '▋'; animation: blink 0.8s infinite; color: #00D4FF; }
    .stat-number { font-family: 'DM Mono', monospace; font-size: 28px; font-weight: 500; background: linear-gradient(135deg, #ffffff, #a8b4d8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .prism-logo { animation: float 4s ease-in-out infinite; }
    .data-pill { display: inline-flex; align-items: center; gap: 6px; background: #0d1b3e; border: 1px solid #1e2d5c; border-radius: 20px; padding: 4px 12px; font-family: 'DM Mono', monospace; font-size: 11px; color: #8892b0; }
    .metric-card { background: linear-gradient(135deg, #0d1b3e, #0a1128); border: 1px solid #1e2d5c; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
    .metric-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
    .metric-card.cyan::before { background: linear-gradient(90deg, transparent, #00D4FF, transparent); }
    .metric-card.gold::before { background: linear-gradient(90deg, transparent, #FFB627, transparent); }
    .metric-card.violet::before { background: linear-gradient(90deg, transparent, #7B4FE8, transparent); }
    .metric-card.green::before { background: linear-gradient(90deg, transparent, #00E5A0, transparent); }
    .scenario-card { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 12px; padding: 18px; margin-top: 12px; animation: fadeSlide 0.3s ease; }
    .grid-bg { background-image: linear-gradient(rgba(30,45,92,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,45,92,0.3) 1px, transparent 1px); background-size: 40px 40px; }
    .landing-hero { background: radial-gradient(ellipse 80% 60% at 50% -20%, #00D4FF15 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 100%, #7B4FE810 0%, transparent 60%); }
    .feature-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .narrative-box { background: #0a1128; border: 1px solid #1e2d5c; border-left: 3px solid #FFB627; border-radius: 0 12px 12px 0; padding: 20px; font-size: 14px; line-height: 1.8; color: #ccd6f6; white-space: pre-wrap; }
    .upload-zone { border: 2px dashed #1e2d5c; border-radius: 16px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
    .upload-zone:hover { border-color: #00D4FF55; background: #00D4FF08; }
    input[type="text"], input[type="password"] { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 8px; color: #e2e8f0; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 12px 16px; outline: none; transition: border-color 0.2s; }
    input[type="text"]:focus, input[type="password"]:focus { border-color: #00D4FF55; }
    input::placeholder { color: #3d4f7c; }
    select { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 8px; color: #e2e8f0; font-family: 'DM Mono', monospace; font-size: 12px; padding: 8px 12px; outline: none; cursor: pointer; }
    .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; color: #8892b0; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 500; border: 1px solid transparent; }
    .sidebar-link:hover { color: #ccd6f6; background: #0d1b3e; }
    .sidebar-link.active { color: #00D4FF; background: #00D4FF0d; border-color: #00D4FF22; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; font-family: 'Syne', sans-serif; letter-spacing: 0.5px; }
    .badge-cyan { background: #00D4FF1a; color: #00D4FF; border: 1px solid #00D4FF33; }
    .badge-gold { background: #FFB6271a; color: #FFB627; border: 1px solid #FFB62733; }
    .badge-violet { background: #7B4FE81a; color: #7B4FE8; border: 1px solid #7B4FE833; }
    .badge-green { background: #00E5A01a; color: #00E5A0; border: 1px solid #00E5A033; }
    .mobile-menu-btn { display: none; background: none; border: 1px solid #1e2d5c; border-radius: 8px; color: #8892b0; font-size: 22px; padding: 6px 10px; cursor: pointer; z-index: 100; }
    .mobile-menu-btn:hover { color: #00D4FF; border-color: #00D4FF55; }
    .sidebar-overlay { display: none; }

    @media (max-width: 768px) {
      .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
      .app-sidebar { position: fixed !important; top: 0; left: 0; bottom: 0; width: 260px !important; z-index: 200; transform: translateX(-100%); transition: transform 0.3s ease; }
      .app-sidebar.open { transform: translateX(0); }
      .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 199; }
      .app-main { width: 100% !important; }
      .top-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 0 !important; }
      .top-tabs::-webkit-scrollbar { display: none; }
      .tab-btn { padding: 8px 12px; font-size: 11px; white-space: nowrap; flex-shrink: 0; }
      .stat-number { font-size: 20px; }
      .glass-card { border-radius: 12px; }
      .metric-card { padding: 14px; }
      .oracle-input { font-size: 13px; padding: 10px 14px; }
      .chat-bubble-user, .chat-bubble-oracle { max-width: 95%; font-size: 13px; }
      .narrative-box { font-size: 13px; padding: 14px; }
      .landing-hero nav { padding: 12px 16px; }
      .landing-hero h1 { letter-spacing: -1px; }
    }
  
    @media print {
      @page { size: A4; margin: 12mm; }
      body, .lumiq-app, .app-main { background: #fff !important; color: #111 !important; }
      .app-sidebar, .sidebar-overlay, .no-print, .lumiq-app button { display: none !important; }
      .app-main { overflow: visible !important; }
      .lumiq-app { height: auto !important; }
      .glass-card, .narrative-box { background: #fff !important; border-color: #bbb !important; color: #111 !important; box-shadow: none !important; }
      .report-page, .report-page * { color: #111 !important; -webkit-text-fill-color: #111 !important; }
      .stat-number { background: none !important; }
    }
  `;
