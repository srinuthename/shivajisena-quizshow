import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const translations = {
  en: {
    headerTitle: "ShivajiSena Quiz Show",
    headerSubtitle: "Chipurupalli's Premier Quiz Competition",
    adminPanel: "Admin Panel",
    announcement: "📢 ANNOUNCEMENT",
    welcomeTitle: "Welcome to ShivajiSena Quiz Show",
    welcomeDescription:
      "Join Chipurupalli's most exciting quiz competition! Test your knowledge across various topics and compete for amazing prizes. Whether you're a student, professional, or quiz enthusiast, this is your chance to shine.",
    startQuiz: "🎮 Start Quiz Game",
    competitionFormat: "🏆 Competition Format",
    prizesAndRewards: "🎁 Prizes & Rewards",
    aboutTitle: "About ShivajiSena",
    aboutDescription:
      "ShivajiSena is Chipurupalli's trusted organization promoting local culture, events, and community activities. Our Quiz Show competition aims to promote education, healthy competition, and community engagement while celebrating the intellectual talent in our region.",
    sponsorsTitle: "🤝 Our Sponsors",
    interestedInSponsoring: "Interested in sponsoring?",
    contactUs: "Contact Us",
    footerText: "© 2024 ShivajiSena Chipurupalli. All rights reserved.",
    poweredBy: "Powered by ShivajiSena | Quiz Competition Platform",
  },
  te: {
    headerTitle: "శివాజీసేన క్విజ్ షో",
    headerSubtitle: "చిపురుపల్లి ప్రీమియర్ క్విజ్ పోటీ",
    adminPanel: "అడ్మిన్ ప్యానెల్",
    announcement: "📢 ప్రకటన",
    welcomeTitle: "శివాజీసేన క్విజ్ షోకు స్వాగతం",
    welcomeDescription:
      "చిపురుపల్లి యొక్క అత్యంత ఉత్తేజకరమైన క్విజ్ పోటీలో పాల్గొనండి! వివిధ అంశాలపై మీ జ్ఞానాన్ని పరీక్షించండి మరియు అద్భుతమైన బహుమతుల కోసం పోటీపడండి. మీరు విద్యార్థి, ప్రొఫెషనల్ లేదా క్విజ్ అభిమాని అయినా, ఇది మీకు ప్రకాశించడానికి అవకాశం.",
    startQuiz: "🎮 క్విజ్ గేమ్ ప్రారంభించు",
    competitionFormat: "🏆 పోటీ ఫార్మాట్",
    prizesAndRewards: "🎁 బహుమతులు & రివార్డులు",
    aboutTitle: "శివాజీసేన గురించి",
    aboutDescription:
      "శివాజీసేన చిపురుపల్లి యొక్క స్థానిక సంస్కృతి, ఈవెంట్లు మరియు సమాజ కార్యకలాపాలను ప్రోత్సహించే విశ్వసనీయ సంస్థ. మా క్విజ్ షో పోటీ విద్య, ఆరోగ్యకరమైన పోటీ మరియు సమాజం యొక్క బౌధిక ప్రతిభను ప్రోత్సహించడం లక్ష్యంగా పెట్టుకుంది.",
    sponsorsTitle: "🤝 మా స్పాన్సర్లు",
    interestedInSponsoring: "స్పాన్సర్ చేయడంలో ఆసక్తి ఉంది?",
    contactUs: "మమ్మల్ని సంప్రదించండి",
    footerText: "© 2024 శివాజీసేన చిపురుపల్లి. అన్ని హక్కులు రిజర్వ్ చేయబడ్డాయి.",
    poweredBy: "శివాజీసేన ద్వారా నడుస్తోంది | క్విజ్ పోటీ ప్లాట్‌ఫారమ్",
  },
};

export default function Home() {
  const [language, setLanguage] = useState<"en" | "te">("en");

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "te" : "en");
  };

  const t = translations[language];

  const sponsors = [
    { name: "ShivajiSena", logo: "/lovable-uploads/51d5ca39-3de5-4ca3-b467-8de1a7331592.png" },
    { name: "ShivajiSena", logo: "/lovable-uploads/51d5ca39-3de5-4ca3-b467-8de1a7331592.png" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/400 via-background to-secondary/400">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-primary to-secondary p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img
              src="/lovable-uploads/51d5ca39-3de5-4ca3-b467-8de1a7331592.png"
              alt="ShivajiSena Logo"
              className="h-20 w-auto rounded-sm"
            />
            <div>
              <h1 className="text-4xl font-bold text-white">{t.headerTitle}</h1>
              <p className="text-white/90 text-lg mt-1">{t.headerSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={toggleLanguage} variant="outline" size="sm">
              {language === "en" ? "తెలుగు" : "English"}
            </Button>
            <Link to="/admin">
              <Button variant="secondary" size="sm">
                {t.adminPanel}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Announcement Ticker */}
        <div className="bg-card border rounded-lg p-4 mb-8 shadow-md overflow-hidden">
          <div className="flex items-center gap-4">
            <span className="text-primary font-semibold text-sm bg-primary/10 px-3 py-1 rounded-full">
              {t.announcement}
            </span>
            <div className="flex-1 overflow-hidden">
              <div className="animate-scroll whitespace-nowrap text-muted-foreground">
                🎉 {t.welcomeTitle}! • 📅 {t.announcement} starts soon! • 🏆 Amazing prizes await winners! • 📺 Live streaming available • 🎯 Test your knowledge and win exciting rewards!
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Welcome Section */}
            <Card className="p-8 text-center">
              <CardContent>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {t.welcomeTitle}
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {t.welcomeDescription}
                </p>
                <Link to="/game">
                  <Button size="lg" className="text-lg px-8 py-4">
                    {t.startQuiz}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <CardContent>
                  <h3 className="text-xl font-semibold mb-3 text-primary">{t.competitionFormat}</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Multiple choice questions</li>
                    <li>• Timed challenges</li>
                    <li>• Lifeline assistance</li>
                    <li>• Progressive difficulty</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="p-6">
                <CardContent>
                  <h3 className="text-xl font-semibold mb-3 text-primary">{t.prizesAndRewards}</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Cash prizes for winners</li>
                    <li>• Certificates for participants</li>
                    <li>• Special recognition awards</li>
                    <li>• Surprise bonus rounds</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* About Section */}
            <Card className="p-6">
              <CardContent>
                <h3 className="text-2xl font-semibold mb-4 text-primary">{t.aboutTitle}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t.aboutDescription}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sponsors Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <CardContent>
                <h3 className="text-xl font-semibold mb-4 text-center text-primary">
                  {t.sponsorsTitle}
                </h3>
                <div className="space-y-4">
                  {sponsors.map((sponsor, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors"
                    >
                      <img
                        src={sponsor.logo}
                        alt={`${sponsor.name} Logo`}
                        className="h-8 w-auto"
                      />
                      <span className="font-medium text-sm">{sponsor.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    {t.interestedInSponsoring}
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    {t.contactUs}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t mt-12 p-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {t.footerText}
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/admin" className="hover:text-primary transition-colors">
                {t.adminPanel}
              </Link>
              <Link to="/game" className="hover:text-primary transition-colors">
                Game
              </Link>
              <span className="hover:text-primary transition-colors cursor-pointer">
                Contact
              </span>
              <span className="hover:text-primary transition-colors cursor-pointer">
                Privacy
              </span>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {t.poweredBy}
          </div>
        </div>
      </footer>
    </div>
  );
}
