import { Box, Puzzle, Rocket } from "lucide-react";

import CopyBlock from "@/components/CopyBlock";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  projectId: string;
  embedSnippet: string;
};

export function EmbedTab({ projectId, embedSnippet }: Props) {
  return (
    <TabsContent value="embed" className="space-y-6">
      <Tabs defaultValue="script" className="w-full space-y-6">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-muted/30 rounded-lg mb-2">
          <TabsTrigger value="script" className="text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all">
            Script
          </TabsTrigger>
          <TabsTrigger value="react-sdk" className="text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all">
            React SDK
          </TabsTrigger>
          <TabsTrigger value="headless" className="text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all">
            Headless
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="h-4 w-4" /> Quick Install
              </CardTitle>
              <CardDescription>Paste this before the closing <code>&lt;/body&gt;</code> tag.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyBlock value={embedSnippet} className="text-xs" />
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">Full HTML Example</CardTitle>
                  <CardDescription>Complete example with custom button - copy & paste to test</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">For Beginners</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyBlock value={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Site with Contextly Chatbot</title>
  
  <!-- OPTIONAL: Add your own styles -->
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    
    /* Custom button to open chat */
    .chat-trigger-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4f46e5; /* Change to your brand color */
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
      transition: transform 0.2s;
    }
    
    .chat-trigger-btn:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <h1>Welcome to My Website</h1>
  <p>This is my site with an AI chatbot assistant.</p>
  
  <!-- Custom button to open/close the chatbot -->
  <button class="chat-trigger-btn" onclick="toggleChat()">
    💬 Chat with us
  </button>

  <!-- 
    ========================================
    COPY THE SCRIPT BELOW AND REPLACE:
    - <WIDGET_TOKEN> with your actual token from Settings tab
    ========================================
  -->
${embedSnippet.replace("<WIDGET_TOKEN>", "<YOUR_WIDGET_TOKEN>")}

  <!-- Control the chatbot -->
  <script>
    // Toggle chat open/close when button is clicked
    function toggleChat() {
      if (window.ChatbotWidget) {
        window.ChatbotWidget.toggle();
      } else {
        console.log('Chatbot is loading...');
      }
    }
    
    // Or use these specific functions:
    // window.ChatbotWidget.open();   // Open the chat
    // window.ChatbotWidget.close();  // Close the chat
  </script>
</body>
</html>`} className="text-xs" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="react-sdk" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Box className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">React SDK</CardTitle>
                  <CardDescription>High-level component for React & Next.js</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">1. Install</Label>
                <CopyBlock value="npm install contextly" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">2. Usage</Label>
                <CopyBlock value={`import { Chat } from "contextly";

function App() {
  return (
    <Chat
      projectId="${projectId}" 
      token="YOUR_WIDGET_TOKEN"
    />
  );
}`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="headless" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Puzzle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Headless Hooks</CardTitle>
                  <CardDescription>Your UI, our logic</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">1. Install</Label>
                <CopyBlock value="npm install contextly" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">2. Usage</Label>
                <CopyBlock value={`import { useChat } from "contextly";

function CustomUI() {
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    projectId: "${projectId}",
    token: "YOUR_WIDGET_TOKEN",
  });

  return (
    <div>
      {messages.map(m => <div key={m.id}>{m.content}</div>)}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => sendMessage()} disabled={isLoading}>Send</button>
    </div>
  );
}`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
