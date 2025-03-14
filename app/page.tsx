"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Mic, Save, RotateCcw, Play, Plus, Download } from "lucide-react"
import ProfilesList from "@/components/profiles-list"
import VoiceVisualizer from "@/components/voice-visualizer"
import { createWebSocketConnection } from "@/lib/websocket"

export default function Home() {
  // Connection status
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [activeTab, setActiveTab] = useState("modulator")
  const wsRef = useRef(null)

  // Voice modulation settings
  const [modulationSettings, setModulationSettings] = useState({
    pitch: 0,
    speed: 1,
    reverb: 0,
    echo: 0,
    distortion: 0,
  })

  // TTS settings
  const [ttsSettings, setTtsSettings] = useState({
    voice: "default",
    pitch: 0,
    speed: 1,
    volume: 1,
    text: "",
  })

  // Profiles
  const [profiles, setProfiles] = useState([
    {
      id: 1,
      name: "Robot Voice",
      type: "modulator",
      settings: { pitch: 5, speed: 1.2, reverb: 0.3, echo: 0.5, distortion: 0.2 },
    },
    {
      id: 2,
      name: "Deep Voice",
      type: "modulator",
      settings: { pitch: -5, speed: 0.9, reverb: 0.1, echo: 0.2, distortion: 0 },
    },
    { id: 3, name: "Narrator", type: "tts", settings: { voice: "default", pitch: 0, speed: 1, volume: 1 } },
  ])
  const [profileName, setProfileName] = useState("")

  // Connect to WebSocket when component mounts
  useEffect(() => {
    const { ws, connect, disconnect } = createWebSocketConnection()
    wsRef.current = { ws, connect, disconnect }

    connect(
      () => {
        setIsConnected(true)
        toast({
          title: "Connected to server",
          description: "Your voice modulator is ready to use",
        })
      },
      () => {
        setIsConnected(false)
        toast({
          title: "Disconnected from server",
          description: "Connection to voice processing server lost",
          variant: "destructive",
        })
      },
    )

    return () => {
      disconnect()
    }
  }, [])

  // Send settings update to server when modulation settings change
  useEffect(() => {
    if (isConnected && wsRef.current?.ws) {
      wsRef.current.ws.send(
        JSON.stringify({
          type: activeTab,
          settings: activeTab === "modulator" ? modulationSettings : ttsSettings,
        }),
      )
    }
  }, [modulationSettings, ttsSettings, isConnected, activeTab])

  const handleModulationChange = (key, value) => {
    setModulationSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleTtsChange = (key, value) => {
    setTtsSettings((prev) => ({ ...prev, [key]: value }))
  }

  const toggleRecording = () => {
    if (wsRef.current?.ws) {
      wsRef.current.ws.send(
        JSON.stringify({
          type: "recording",
          action: isRecording ? "stop" : "start",
        }),
      )
      setIsRecording(!isRecording)

      if (!isRecording) {
        toast({
          title: "Recording started",
          description: "Your voice is being processed",
        })
      } else {
        toast({
          title: "Recording stopped",
        })
      }
    }
  }

  const playTts = () => {
    if (wsRef.current?.ws && ttsSettings.text) {
      wsRef.current.ws.send(
        JSON.stringify({
          type: "tts",
          action: "play",
          settings: ttsSettings,
        }),
      )

      toast({
        title: "Playing text",
      })
    } else {
      toast({
        title: "Cannot play",
        description: "Please enter some text first",
        variant: "destructive",
      })
    }
  }

  const saveProfile = () => {
    if (!profileName) {
      toast({
        title: "Please enter a profile name",
        variant: "destructive",
      })
      return
    }

    const newProfile = {
      id: Date.now(),
      name: profileName,
      type: activeTab,
      settings: activeTab === "modulator" ? { ...modulationSettings } : { ...ttsSettings },
    }

    setProfiles([...profiles, newProfile])
    setProfileName("")

    toast({
      title: "Profile saved",
      description: `${profileName} has been saved to your profiles`,
    })
  }

  const loadProfile = (profile) => {
    if (profile.type === "modulator") {
      setModulationSettings(profile.settings)
      setActiveTab("modulator")
    } else {
      setTtsSettings(profile.settings)
      setActiveTab("tts")
    }

    toast({
      title: "Profile loaded",
      description: `${profile.name} has been loaded`,
    })
  }

  const deleteProfile = (id) => {
    setProfiles(profiles.filter((profile) => profile.id !== id))

    toast({
      title: "Profile deleted",
    })
  }

  const resetSettings = () => {
    if (activeTab === "modulator") {
      setModulationSettings({
        pitch: 0,
        speed: 1,
        reverb: 0,
        echo: 0,
        distortion: 0,
      })
    } else {
      setTtsSettings({
        ...ttsSettings,
        pitch: 0,
        speed: 1,
        volume: 1,
      })
    }

    toast({
      title: "Settings reset",
      description: "All values have been reset to default",
    })
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Voice Modulator & TTS</h1>
          <p className="text-muted-foreground">Customize your voice or generate speech with multiple effects</p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="modulator">Voice Modulator</TabsTrigger>
                <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
              </TabsList>

              <TabsContent value="modulator" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Voice Modulation</CardTitle>
                    <CardDescription>Modify your voice in real-time with various effects</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <VoiceVisualizer isActive={isRecording} />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Pitch ({modulationSettings.pitch} semitones)</Label>
                          <span className="text-xs text-muted-foreground">
                            {modulationSettings.pitch < 0
                              ? "Deeper"
                              : modulationSettings.pitch > 0
                                ? "Higher"
                                : "Normal"}
                          </span>
                        </div>
                        <Slider
                          value={[modulationSettings.pitch]}
                          min={-12}
                          max={12}
                          step={0.5}
                          onValueChange={([value]) => handleModulationChange("pitch", value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Speed ({modulationSettings.speed.toFixed(1)}x)</Label>
                          <span className="text-xs text-muted-foreground">
                            {modulationSettings.speed < 1
                              ? "Slower"
                              : modulationSettings.speed > 1
                                ? "Faster"
                                : "Normal"}
                          </span>
                        </div>
                        <Slider
                          value={[modulationSettings.speed]}
                          min={0.5}
                          max={2}
                          step={0.1}
                          onValueChange={([value]) => handleModulationChange("speed", value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Reverb ({Math.round(modulationSettings.reverb * 100)}%)</Label>
                          <span className="text-xs text-muted-foreground">
                            {modulationSettings.reverb > 0 ? "Spacious" : "None"}
                          </span>
                        </div>
                        <Slider
                          value={[modulationSettings.reverb]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) => handleModulationChange("reverb", value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Echo ({Math.round(modulationSettings.echo * 100)}%)</Label>
                          <span className="text-xs text-muted-foreground">
                            {modulationSettings.echo > 0 ? "Audible" : "None"}
                          </span>
                        </div>
                        <Slider
                          value={[modulationSettings.echo]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) => handleModulationChange("echo", value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Distortion ({Math.round(modulationSettings.distortion * 100)}%)</Label>
                          <span className="text-xs text-muted-foreground">
                            {modulationSettings.distortion > 0 ? "Intense" : "None"}
                          </span>
                        </div>
                        <Slider
                          value={[modulationSettings.distortion]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) => handleModulationChange("distortion", value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
                      onClick={toggleRecording}
                      disabled={!isConnected}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </Button>
                    <Button variant="outline" onClick={resetSettings}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="tts" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Text-to-Speech</CardTitle>
                    <CardDescription>Convert text to speech with customizable voice settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="voice-select">Voice</Label>
                      <Select value={ttsSettings.voice} onValueChange={(value) => handleTtsChange("voice", value)}>
                        <SelectTrigger id="voice-select">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="robotic">Robotic</SelectItem>
                          <SelectItem value="whisper">Whisper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Pitch ({ttsSettings.pitch} semitones)</Label>
                          <span className="text-xs text-muted-foreground">
                            {ttsSettings.pitch < 0 ? "Deeper" : ttsSettings.pitch > 0 ? "Higher" : "Normal"}
                          </span>
                        </div>
                        <Slider
                          value={[ttsSettings.pitch]}
                          min={-12}
                          max={12}
                          step={0.5}
                          onValueChange={([value]) => handleTtsChange("pitch", value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Speed ({ttsSettings.speed.toFixed(1)}x)</Label>
                          <span className="text-xs text-muted-foreground">
                            {ttsSettings.speed < 1 ? "Slower" : ttsSettings.speed > 1 ? "Faster" : "Normal"}
                          </span>
                        </div>
                        <Slider
                          value={[ttsSettings.speed]}
                          min={0.5}
                          max={2}
                          step={0.1}
                          onValueChange={([value]) => handleTtsChange("speed", value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Volume ({Math.round(ttsSettings.volume * 100)}%)</Label>
                        </div>
                        <Slider
                          value={[ttsSettings.volume]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) => handleTtsChange("volume", value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tts-text">Text to speak</Label>
                      <Textarea
                        id="tts-text"
                        placeholder="Type text here to be converted to speech..."
                        value={ttsSettings.text}
                        onChange={(e) => handleTtsChange("text", e.target.value)}
                        rows={5}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button onClick={playTts} disabled={!isConnected || !ttsSettings.text}>
                      <Play className="mr-2 h-4 w-4" />
                      Play
                    </Button>
                    <Button variant="outline" onClick={resetSettings}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Voice Profiles</CardTitle>
                <CardDescription>Save and load your favorite voice settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Profile name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                  <Button onClick={saveProfile} disabled={!profileName}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>

                <div className="h-[500px] overflow-y-auto pr-2">
                  <ProfilesList
                    profiles={profiles}
                    onLoad={loadProfile}
                    onDelete={deleteProfile}
                    activeTab={activeTab}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles))
                    const downloadAnchorNode = document.createElement("a")
                    downloadAnchorNode.setAttribute("href", dataStr)
                    downloadAnchorNode.setAttribute("download", "voice-profiles.json")
                    document.body.appendChild(downloadAnchorNode)
                    downloadAnchorNode.click()
                    downloadAnchorNode.remove()
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const fileInput = document.createElement("input")
                    fileInput.type = "file"
                    fileInput.accept = ".json"
                    fileInput.onchange = (e) => {
                      const file = e.target.files[0]
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        try {
                          const importedProfiles = JSON.parse(event.target.result)
                          setProfiles([...profiles, ...importedProfiles])
                          toast({
                            title: "Profiles imported",
                            description: `${importedProfiles.length} profiles were imported`,
                          })
                        } catch (error) {
                          toast({
                            title: "Import failed",
                            description: "The file does not contain valid profile data",
                            variant: "destructive",
                          })
                        }
                      }
                      reader.readAsText(file)
                    }
                    fileInput.click()
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

