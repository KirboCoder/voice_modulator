"use client"

import { Button } from "@/components/ui/button"
import { Play, Trash } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

type Profile = {
  id: number
  name: string
  type: string
  settings: any
}

type ProfilesListProps = {
  profiles: Profile[]
  onLoad: (profile: Profile) => void
  onDelete: (id: number) => void
  activeTab: string
}

export default function ProfilesList({ profiles, onLoad, onDelete, activeTab }: ProfilesListProps) {
  const filteredProfiles = profiles.filter((profile) => activeTab === "all" || profile.type === activeTab)

  if (filteredProfiles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No profiles saved yet</p>
        <p className="text-sm mt-2">Adjust settings and save a profile to see it here</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2">
        {filteredProfiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{profile.name}</span>
                <Badge variant={profile.type === "modulator" ? "default" : "secondary"}>
                  {profile.type === "modulator" ? "Voice" : "TTS"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {profile.type === "modulator" ? (
                  <span>
                    Pitch: {profile.settings.pitch}, Speed: {profile.settings.speed}
                    {profile.settings.reverb > 0 && `, Reverb: ${Math.round(profile.settings.reverb * 100)}%`}
                    {profile.settings.echo > 0 && `, Echo: ${Math.round(profile.settings.echo * 100)}%`}
                  </span>
                ) : (
                  <span>
                    Voice: {profile.settings.voice}, Pitch: {profile.settings.pitch}, Speed: {profile.settings.speed}
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-1">
              <Button size="sm" variant="ghost" onClick={() => onLoad(profile)}>
                <Play className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(profile.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

