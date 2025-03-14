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
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Mic, Save, RotateCcw, Play, Plus, Download, Headphones, Settings } from "lucide-react"
import ProfilesList from "@/components/profiles-list"
import VoiceVisualizer from "@/components/voice-visualizer"
import { createWebSocketConnection } from "@/lib/websocket"
import AudioPlayer from "@/components/audio-player"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function Home() {
  // Connection status
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRealTimeMode, setIsRealTimeMode] = useState(false)
  const [activeTab, setActiveTab] = useState("modulator")
  const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] })
  const [selectedDevices, setSelectedDevices] = useState({ input: "", output: "" })
  const wsRef = useRef(null)
  const [ttsAudio, setTtsAudio] = useState(null)

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
  const [isBrowserTtsUsed, setIsBrowserTtsUsed] = useState(false)

  const [browserTtsError, setBrowserTtsError] = useState(null)

  const useBrowserTts = () => {
    // Use browser's built-in speech synthesis as fallback
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(ttsSettings.text)

      // Apply settings as best as possible
      utterance.rate = ttsSettings.speed
      utterance.pitch = 1 + ttsSettings.pitch / 12 // Approximate conversion
      utterance.volume = ttsSettings.volume

      // Try to match voice if possible
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        // Simple mapping of our voice types to potential system voices
        if (ttsSettings.voice === "male") {
          const maleVoice = voices.find((v) => v.name.toLowerCase().includes("male"))
          if (maleVoice) utterance.voice = maleVoice
        } else if (ttsSettings.voice === "female") {
          const femaleVoice = voices.find((v) => v.name.toLowerCase().includes("female"))
          if (femaleVoice) utterance.voice = femaleVoice
        }
      }

      utterance.onerror = (event) => {
        setBrowserTtsError("Browser TTS error: " + event.error)
      }

      window.speechSynthesis.speak(utterance)

      toast({
        title: "Using browser TTS",
        description: "Server not available, using browser's built-in TTS",
      })
    } else {
      setBrowserTtsError("Your browser does not support speech synthesis")
      toast({
        title: "TTS not available",
        description: "Your browser does not support speech synthesis",
        variant: "destructive",
      })
    }

    setIsBrowserTtsUsed(true)
  }

  // Connect to WebSocket when component mounts
  useEffect(() => {
    const { ws, connect, disconnect, isConnected: checkConnection, send } = createWebSocketConnection()

    // Create a safer send function that handles errors
    const safeSend = (data) => {
      try {
        if (checkConnection()) {
          return send(data)
        }
        return false
      } catch (error) {
        console.error("Error sending data:", error)
        return false
      }
    }

    wsRef.current = {
      ws,
      connect,
      disconnect,
      isConnected: checkConnection,
      send: safeSend,
    }

    // Try to connect to the WebSocket server
    connect(
      () => {
        // Connection successful
        setIsConnected(true)
        toast({
          title: "Connected to server",
          description: "Your voice modulator is ready to use",
        })

        // Request available audio devices
        safeSend({
          type: "system",
          action: "get_audio_devices",
        })
      },
      () => {
        // Connection failed or closed
        setIsConnected(false)

        // If we were recording, stop the recording UI state
        if (isRecording) {
          setIsRecording(false)
        }

        // If we were in real-time mode, turn it off
        if (isRealTimeMode) {
          setIsRealTimeMode(false)
        }

        // Only show the toast once
        if (isConnected) {
          toast({
            title: "Disconnected from server",
            description: "Connection to voice processing server lost. Using fallback mode.",
            variant: "destructive",
          })
        }
      },
      (data) => {
        // Handle incoming messages
        if (data.type === "audio_devices") {
          setAudioDevices({
            inputs: data.inputs || [],
            outputs: data.outputs || [],
          })

          // Set default devices if available
          if (data.inputs.length > 0 && !selectedDevices.input) {
            setSelectedDevices((prev) => ({ ...prev, input: data.inputs[0].id }))
          }

          if (data.outputs.length > 0 && !selectedDevices.output) {
            setSelectedDevices((prev) => ({ ...prev, output: data.outputs[0].id }))
          }
        } else if (data.type === "tts_audio") {
          // Handle TTS audio data
          setTtsAudio(data.audio_data)
        }
      },
    )

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [isRecording, isRealTimeMode, isConnected])

  // Send settings update to server when modulation settings change
  useEffect(() => {
    if (isConnected && wsRef.current?.send) {
      wsRef.current.send({
        type: activeTab,
        settings: activeTab === "modulator" ? modulationSettings : ttsSettings,
      })
    }
  }, [modulationSettings, ttsSettings, isConnected, activeTab])

  // Update audio devices when they change
  useEffect(() => {
    if (isConnected && wsRef.current?.send) {
      wsRef.current.send({
        type: "system",
        action: "set_audio_devices",
        devices: selectedDevices,
      })
    }
  }, [selectedDevices, isConnected])

  const handleModulationChange = (key, value) => {
    setModulationSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleTtsChange = (key, value) => {
    setTtsSettings((prev) => ({ ...prev, [key]: value }))
  }

  const toggleRecording = () => {
    if (!isConnected) {
      toast({
        title: "Server not connected",
        description: "Cannot start recording without server connection",
        variant: "destructive",
      })
      return
    }

    if (wsRef.current?.send) {
      const success = wsRef.current.send({
        type: "recording",
        action: isRecording ? "stop" : "start",
        devices: selectedDevices,
      })

      if (success) {
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
      } else {
        toast({
          title: "Failed to send command",
          description: "Server connection issue",
          variant: "destructive",
        })
      }
    }
  }

  const toggleRealTimeMode = () => {
    if (!isConnected) {
      toast({
        title: "Server not connected",
        description: "Cannot enable real-time mode without server connection",
        variant: "destructive",
      })
      return
    }

    // Cannot have both recording and real-time mode active
    if (isRecording) {
      toast({
        title: "Recording in progress",
        description: "Please stop recording before enabling real-time mode",
        variant: "destructive",
      })
      return
    }

    if (wsRef.current?.send) {
      const success = wsRef.current.send({
        type: "realtime",
        action: isRealTimeMode ? "stop" : "start",
        devices: selectedDevices,
      })

      if (success) {
        setIsRealTimeMode(!isRealTimeMode)

        if (!isRealTimeMode) {
          toast({
            title: "Real-time mode enabled",
            description: "Your voice is being processed for external applications",
          })
        } else {
          toast({
            title: "Real-time mode disabled",
          })
        }
      } else {
        toast({
          title: "Failed to send command",
          description: "Server connection issue",
          variant: "destructive",
        })
      }
    }
  }

  const playTts = () => {
    if (!ttsSettings.text) {
      toast({
        title: "Cannot play",
        description: "Please enter some text first",
        variant: "destructive",
      })
      return
    }

    setIsBrowserTtsUsed(false)

    // First try to use the WebSocket server if connected
    if (isConnected && wsRef.current?.send) {
      try {
        const success = wsRef.current.send({
          type: "tts",
          action: "play",
          settings: ttsSettings,
          output_device: selectedDevices.output,
        })

        if (success) {
          toast({
            title: "Generating speech",
            description: "Please wait while your text is processed",
          })
          return // Successfully sent to server
        }
      } catch (error) {
        console.error("Error sending TTS request:", error)
        // Continue to fallback
      }
    }

    // If we get here, either the server is not connected or the send failed
    // Use browser's built-in TTS as fallback
    handleBrowserTts()
  }

  const [browserTtsUtterance, setBrowserTtsUtterance] = useState(null)

  useEffect(() => {
    if (browserTtsUtterance) {
      window.speechSynthesis.speak(browserTtsUtterance)
    }
    return () => {
      if (browserTtsUtterance) {
        window.speechSynthesis.cancel()
      }
    }
  }, [browserTtsUtterance])

  const handleBrowserTts = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(ttsSettings.text)

      utterance.rate = ttsSettings.speed
      utterance.pitch = 1 + ttsSettings.pitch / 12
      utterance.volume = ttsSettings.volume

      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        if (ttsSettings.voice === "male") {
          const maleVoice = voices.find((v) => v.name.toLowerCase().includes("male"))
          if (maleVoice) utterance.voice = maleVoice
        } else if (ttsSettings.voice === "female") {
          const femaleVoice = voices.find((v) => v.name.toLowerCase().includes("female"))
          if (femaleVoice) utterance.voice = femaleVoice
        }
      }

      utterance.onerror = (event) => {
        setBrowserTtsError("Browser TTS error: " + event.error)
      }

      setBrowserTtsUtterance(utterance)

      toast({
        title: "Using browser TTS",
        description: "Server not available, using browser's built-in TTS",
      })
    } else {
      setBrowserTtsError("Your browser does not support speech synthesis")
      toast({
        title: "TTS not available",
        description: "Your browser does not support speech synthesis",
        variant: "destructive",
      })
    }

    setIsBrowserTtsUsed(true)
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
      setTtsSettings({ ...ttsSettings, ...profile.settings })
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
          <div className="mt-2 flex items-center justify-center gap-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {isConnected ? "Connected" : "Disconnected (Fallback Mode)"}
            </span>

            {isRealTimeMode && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Real-Time Mode Active
              </span>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Audio Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Audio Device Settings</DialogTitle>
                  <DialogDescription>Configure input and output devices for voice modulation</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="input-device">Input Device (Microphone)</Label>
                    <Select
                      value={selectedDevices.input}
                      onValueChange={(value) => setSelectedDevices((prev) => ({ ...prev, input: value }))}
                      disabled={!isConnected || audioDevices.inputs.length === 0}
                    >
                      <SelectTrigger id="input-device">
                        <SelectValue placeholder={isConnected ? "Select input device" : "Server disconnected"} />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.inputs.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name}
                          </SelectItem>
                        ))}
                        {audioDevices.inputs.length === 0 && (
                          <SelectItem value="none" disabled>
                            No devices found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="output-device">Output Device (Speakers)</Label>
                    <Select
                      value={selectedDevices.output}
                      onValueChange={(value) => setSelectedDevices((prev) => ({ ...prev, output: value }))}
                      disabled={!isConnected || audioDevices.outputs.length === 0}
                    >
                      <SelectTrigger id="output-device">
                        <SelectValue placeholder={isConnected ? "Select output device" : "Server disconnected"} />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.outputs.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name}
                          </SelectItem>
                        ))}
                        {audioDevices.outputs.length === 0 && (
                          <SelectItem value="none" disabled>
                            No devices found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={() => {
                      toast({
                        title: "Settings saved",
                        description: "Audio device settings have been updated",
                      })
                    }}
                  >
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    <VoiceVisualizer isActive={isRecording || isRealTimeMode} />

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
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="flex justify-between w-full">
                      <Button
                        className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
                        onClick={toggleRecording}
                        disabled={!isConnected || isRealTimeMode}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        {isRecording ? "Stop Recording" : "Start Recording"}
                      </Button>
                      <Button variant="outline" onClick={resetSettings}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </div>

                    <div className="flex items-center justify-between w-full p-4 border rounded-md bg-muted/20">
                      <div className="flex flex-col">
                        <h4 className="font-medium flex items-center">
                          <Headphones className="h-4 w-4 mr-2" />
                          Real-Time Mode
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Process audio for external apps like Discord or games
                        </p>
                      </div>
                      <Switch
                        checked={isRealTimeMode}
                        onCheckedChange={toggleRealTimeMode}
                        disabled={!isConnected || isRecording}
                      />
                    </div>
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

                    {ttsAudio && (
                      <div className="mt-4">
                        <AudioPlayer audioData={ttsAudio} />
                      </div>
                    )}
                    {browserTtsError && <div className="mt-4 text-red-500">{browserTtsError}</div>}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button onClick={playTts}>
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

