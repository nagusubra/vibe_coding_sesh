# 🧠 RotCheck - AI-Powered Content Quality Detector

**Instantly analyze any webpage to determine if it's valuable content or brainrot** using advanced AI from Perplexity Sonar.

<div align="center">

![RotCheck Extension](https://img.shields.io/badge/Chrome_Extension-v1.0-blue?style=for-the-badge&logo=googlechrome)
![AI Powered](https://img.shields.io/badge/AI_Powered-Perplexity_Sonar-purple?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-✅_Safe-green?style=for-the-badge&logo=shield)

</div>

## 🚀 Features

- **🎯 Instant AI Analysis** - One-click verdict on any webpage
- **🌟 5-Point Quality Spectrum** - From brainrot to peak content  
- **📊 Confidence Scoring** - See how certain the AI is about its verdict
- **🔗 Link Analysis** - Scan outbound links for quality assessment
- **⏱️ Time Tracking** - Monitor how long you spend on each page
- **🎨 Modern UI** - Beautiful interface with San Francisco Pro fonts
- **🔒 Secure & Private** - API key stored locally, no data collection

## 📦 Installation from GitHub

### Option 1: Load Unpacked Extension (Recommended)

1. **Download the Extension**
   ```bash
   git clone https://github.com/nagusubra/vibe_coding_sesh.git
   cd vibe_coding_sesh
   ```
   
   Or download the ZIP file and extract it.

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)

3. **Load the Extension**
   - Click **"Load unpacked"**
   - Select the downloaded `vibe_coding_sesh` folder
   - The RotCheck extension should now appear in your extensions list

4. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "RotCheck" and click the pin icon to keep it visible

### Option 2: Direct Installation (When Available)
🔜 **Coming to Chrome Web Store Soon!** - Direct installation will be available shortly.

## 🔑 Setup & Configuration

### 1. Get Your Perplexity API Key
- Visit [Perplexity AI](https://www.perplexity.ai/)
- Sign up for an account and generate an API key
- Your key will start with `pplx-`

### 2. First-Time Setup
- Click the RotCheck extension icon
- Enter your Perplexity API key when prompted
- Click "Save & Analyze"

**🔒 Security Note**: Your API key is stored securely in your browser's local storage and never shared or transmitted anywhere except to Perplexity's API.

## 🎮 How to Use

### Basic Analysis
1. **Navigate** to any webpage
2. **Click** the RotCheck icon in your toolbar
3. **Wait** for the AI analysis (2-3 seconds)
4. **View** the verdict, confidence score, and reasoning

### Understanding Results

**🚀 Peak Content** - High-value, educational, or productive content  
**👌 Decent** - Moderately useful content worth your time  
**😐 Meh** - Neutral content, neither great nor terrible  
**📉 Doomscroll** - Low-value content that might waste time  
**💀 Brainrot** - Time-wasting content you should avoid  

### Advanced Features
- **Link Analysis**: Click "Analyze Links" to scan outbound links
- **Time Tracking**: See how long you've spent on the current page
- **Alternative Suggestions**: Get quality content recommendations for brainrot pages

## 🛠️ Troubleshooting

### Common Issues

**"Network error" or CORS issues**
- Some Perplexity accounts may have browser restrictions
- Try using a proxy or server-side implementation

**"Invalid API key"**
- Ensure your key starts with `pplx-`
- Check that your Perplexity account is active
- Regenerate your API key if needed

**Extension not working**
- Refresh the page and try again
- Check that you have an active internet connection
- Ensure the extension has proper permissions

### Getting Help
- Check the [Issues page](https://github.com/nagusubra/vibe_coding_sesh/issues) for known problems
- Create a new issue if you encounter bugs
- Include browser version and error messages when reporting issues

## 🔐 Security & Privacy

**✅ Completely Safe for Installation**

- **No hardcoded API keys** in source code
- **Local storage only** - your API key never leaves your browser
- **No data collection** - we don't track or store your browsing data
- **Open source** - full code available for security review
- **Minimal permissions** - only requests necessary browser access

### Permissions Explained
- **activeTab** - Access current page content for analysis
- **storage** - Store your API key securely in browser
- **scripting** - Extract page content safely
- **api.perplexity.ai** - Send content for AI analysis

## 🛣️ Roadmap

- [ ] **Chrome Web Store Release** - Official store listing
- [ ] **Enhanced Analytics** - Detailed browsing insights  
- [ ] **Custom Categories** - User-defined content classification
- [ ] **Productivity Dashboard** - Track your content quality over time
- [ ] **Team Features** - Share insights with colleagues
- [ ] **Browser Sync** - Sync settings across devices

## 📊 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI Engine**: Perplexity Sonar API
- **Font**: San Francisco Pro Display/Text
- **Architecture**: Chrome Extension Manifest V3
- **Storage**: Chrome Storage API (Local)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Perplexity AI** for providing the AI analysis engine
- **Chrome Extensions Team** for the robust platform
- **San Francisco Pro** font family for beautiful typography
- **Contributors** and beta testers for feedback and improvements

---

<div align="center">

**Made with ❤️ by the RotCheck Team**

[Report Bug](https://github.com/nagusubra/vibe_coding_sesh/issues) · [Request Feature](https://github.com/nagusubra/vibe_coding_sesh/issues) · [View Source](https://github.com/nagusubra/vibe_coding_sesh)

**🔜 Coming to Chrome Web Store Soon!**

</div>
