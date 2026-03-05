"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { 
  Bell, Clock, Music, Settings, LogOut, Menu, X, Play, Trash2, 
  Edit, Plus, Upload, Volume2, Calendar, MapPin, School, ChevronRight,
  Home, FileAudio, Power, Lock, User, Key, VolumeX
} from "lucide-react"

// Types
type AppIdentity = {
  id?: string
  schoolName: string
  description?: string
  address?: string
  logoUrl?: string
}

type Schedule = {
  id: string
  name: string
  day: string
  time: string
  audioId?: string
  audioName?: string
  isActive: boolean
  createdAt: string
}

type Audio = {
  id: string
  name: string
  originalName: string
  mimeType: string
  size: number
  filePath: string
  createdAt: string
}

type AccessCode = {
  id: string
  code: string
  name: string
  isActive: boolean
  createdAt: string
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]

// ==================== REAL-TIME CLOCK ====================
function RealTimeClock({ large = false }: { large?: boolean }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center">
      <div className={`${large ? 'text-6xl md:text-8xl' : 'text-4xl md:text-5xl'} font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent`}>
        {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className={`${large ? 'text-xl' : 'text-base'} text-muted-foreground mt-2`}>
        {time.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  )
}

// ==================== AUTO BELL ENGINE (GLOBAL) ====================
function useAutoBellEngine(schedules: Schedule[], audios: Audio[], isEnabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const triggeredRef = useRef<Set<string>>(new Set())
  const [lastTriggered, setLastTriggered] = useState<string | null>(null)
  const [nextTrigger, setNextTrigger] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<"idle" | "playing">("idle")

  const checkSchedule = useCallback(() => {
    const now = new Date()
    const dayIndex = now.getDay()
    const currentDay = DAYS[dayIndex === 0 ? 6 : dayIndex - 1]
    const currentTime = now.toTimeString().slice(0, 5)
    const currentSecond = now.getSeconds()
    const triggerKey = `${currentDay}-${currentTime}`

    const todaySchedules = schedules.filter(s => s.day === currentDay && s.isActive)

    // Find next trigger
    const nextSchedule = todaySchedules.find(s => s.time > currentTime)
    if (nextSchedule) {
      setNextTrigger(`${nextSchedule.time} - ${nextSchedule.name}`)
    } else {
      const tomorrowIndex = (dayIndex + 1) % 7
      const tomorrowDay = DAYS[tomorrowIndex === 0 ? 6 : tomorrowIndex - 1]
      const tomorrowSchedules = schedules.filter(s => s.day === tomorrowDay && s.isActive).sort((a, b) => a.time.localeCompare(b.time))
      const firstSchedule = tomorrowSchedules[0]
      if (firstSchedule) {
        setNextTrigger(`Besok ${firstSchedule.time} - ${firstSchedule.name}`)
      } else {
        setNextTrigger(null)
      }
    }

    // Only trigger at the start of each minute (second 0-5)
    if (currentSecond > 5) return

    // Check if current time matches any schedule
    const matchingSchedule = todaySchedules.find(s => s.time === currentTime)
    
    if (matchingSchedule && !triggeredRef.current.has(triggerKey)) {
      triggeredRef.current.add(triggerKey)
      
      // Find and play audio
      const audio = audios.find(a => a.id === matchingSchedule.audioId)
      
      if (audio) {
        setLastTriggered(`${matchingSchedule.name} - ${currentTime}`)
        setCurrentStatus("playing")

        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        
        audioRef.current = new Audio(audio.filePath)
        audioRef.current.volume = 1.0
        
        audioRef.current.play().then(() => {
          toast({ 
            title: "🔔 Bel Otomatis", 
            description: `${matchingSchedule.name} - ${currentTime}` 
          })
        }).catch(err => {
          console.error("Audio play error:", err)
          toast({
            title: "⚠️ Error Memutar Audio",
            description: "Klik halaman terlebih dahulu untuk mengaktifkan audio",
            variant: "destructive"
          })
        })

        audioRef.current.onended = () => {
          setCurrentStatus("idle")
        }
      } else {
        toast({ 
          title: "🔔 Jadwal Tiba", 
          description: `${matchingSchedule.name} - Tidak ada audio`,
          variant: "destructive"
        })
      }
    }

    // Reset triggered set at midnight
    if (currentTime === "00:00" && currentSecond === 0) {
      triggeredRef.current.clear()
    }
  }, [schedules, audios])

  useEffect(() => {
    if (!isEnabled) return
    
    // Check every second (including immediately via interval)
    const interval = setInterval(checkSchedule, 1000)
    // Run first check immediately
    checkSchedule()
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, schedules.length, audios.length])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setCurrentStatus("idle")
  }, [])

  return { lastTriggered, nextTrigger, currentStatus, stopAudio }
}

// ==================== GUEST PAGE ====================
function GuestPage({ 
  identity, 
  onAdminLogin, 
  onPetugasLogin 
}: { 
  identity: AppIdentity | null
  onAdminLogin: () => void
  onPetugasLogin: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {identity?.logoUrl ? (
              <img src={identity.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg bg-white p-1" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <School className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{identity?.schoolName || "Sekolah"}</h1>
              {identity?.address && <p className="text-sm text-white/60">{identity.address}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={onPetugasLogin}>
              <Key className="w-4 h-4 mr-2" />
              Petugas
            </Button>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={onAdminLogin}>
              <Lock className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl">
          {/* School Profile Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {identity?.logoUrl ? (
                    <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center">
                      <img src={identity.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-40 h-40 md:w-48 md:h-48 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <School className="w-20 h-20 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    {identity?.schoolName || "Nama Sekolah"}
                  </h1>
                  
                  {identity?.description && (
                    <p className="text-lg text-white/80 mb-4 leading-relaxed">
                      {identity.description}
                    </p>
                  )}
                  
                  {identity?.address && (
                    <div className="flex items-center justify-center md:justify-start gap-2 text-white/60">
                      <MapPin className="w-5 h-5" />
                      <span>{identity.address}</span>
                    </div>
                  )}
                  
                  {!identity?.description && !identity?.address && (
                    <p className="text-white/50 italic">
                      Klik tombol Admin untuk mengelola profil sekolah
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clock */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl mb-8">
            <CardContent className="py-10">
              <RealTimeClock large />
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/15 transition-colors">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Bel Otomatis</h3>
                <p className="text-white/60 text-sm mt-2">Sistem bel otomatis berdasarkan jadwal yang telah ditentukan</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/15 transition-colors">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Jadwal Terstruktur</h3>
                <p className="text-white/60 text-sm mt-2">Pengaturan jadwal bel per hari dan waktu dengan mudah</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/15 transition-colors">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Audio Kustom</h3>
                <p className="text-white/60 text-sm mt-2">Upload dan gunakan audio bel sesuai keinginan</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 backdrop-blur-sm bg-black/20 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/60 text-sm">© 2024 Sistem Bel Sekolah Otomatis | Dikembangkan untuk kebutuhan pendidikan</p>
        </div>
      </footer>
    </div>
  )
}

// ==================== ADMIN LOGIN FORM ====================
function AdminLoginForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("admin@sekolah.com")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      })
      if (result?.error) {
        toast({
          title: "Login Gagal",
          description: "Email atau password salah",
          variant: "destructive"
        })
      } else {
        toast({ title: "Login Berhasil", description: "Selamat datang di Dashboard Admin" })
        onClose()
      }
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle>Login Admin</CardTitle>
        <CardDescription>Masuk ke dashboard administrator</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600">
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </div>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Default: admin@sekolah.com / admin123
        </p>
      </CardContent>
    </Card>
  )
}

// ==================== PETUGAS LOGIN FORM ====================
function PetugasLoginForm({ onSuccess }: { onSuccess: (name: string) => void }) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/access-code")
      const codes: AccessCode[] = await res.json()
      
      const validCode = codes.find(c => c.code.toUpperCase() === code.toUpperCase() && c.isActive)
      
      if (validCode) {
        toast({ title: "Akses Diterima", description: `Selamat datang, ${validCode.name}` })
        onSuccess(validCode.name)
      } else {
        toast({ title: "Kode Tidak Valid", description: "Kode akses salah atau tidak aktif", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Gagal memverifikasi kode", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
            <Key className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle>Akses Petugas</CardTitle>
        <CardDescription>Masukkan kode akses petugas jadwal</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kode Akses</Label>
            <Input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value.toUpperCase())} 
              placeholder="Masukkan kode..."
              className="text-center text-lg tracking-widest"
              required 
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-cyan-600">
            {loading ? "Memverifikasi..." : "Masuk"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Default: PETUGAS2024
        </p>
      </CardContent>
    </Card>
  )
}

// ==================== PETUGAS DASHBOARD ====================
function PetugasDashboard({ 
  schedules, 
  audios, 
  petugasName,
  onLogout,
  onUpdate
}: { 
  schedules: Schedule[]
  audios: Audio[]
  petugasName: string
  onLogout: () => void
  onUpdate: () => void
}) {
  const [selectedAudioId, setSelectedAudioId] = useState<string>("")
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const now = new Date()
  const dayIndex = now.getDay()
  const currentDay = DAYS[dayIndex === 0 ? 6 : dayIndex - 1]
  const currentTime = now.toTimeString().slice(0, 5)
  const todaySchedules = schedules.filter(s => s.day === currentDay).sort((a, b) => a.time.localeCompare(b.time))

  const playBell = () => {
    const audio = audios.find(a => a.id === selectedAudioId)
    if (!audio) {
      toast({ title: "Error", description: "Pilih audio terlebih dahulu", variant: "destructive" })
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    audioRef.current = new Audio(audio.filePath)
    audioRef.current.play()
    setPlaying(true)

    audioRef.current.onended = () => setPlaying(false)
    toast({ title: "Bel Dibunyikan", description: `Memutar: ${audio.name}` })
  }

  const stopBell = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPlaying(false)
  }

  const toggleSchedule = async (schedule: Schedule) => {
    try {
      const res = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...schedule, isActive: !schedule.isActive })
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: schedule.isActive ? "Jadwal Dinonaktifkan" : "Jadwal Diaktifkan" })
      onUpdate()
    } catch {
      toast({ title: "Error", description: "Gagal mengubah status", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Mode Petugas</h1>
              <p className="text-sm text-muted-foreground">{petugasName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        {/* Clock */}
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8">
            <RealTimeClock />
          </CardContent>
        </Card>

        {/* Manual Bell */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-500" />
              Bunyikan Bel Manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Select value={selectedAudioId} onValueChange={setSelectedAudioId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Pilih audio" />
                </SelectTrigger>
                <SelectContent>
                  {audios.map((audio) => (
                    <SelectItem key={audio.id} value={audio.id}>{audio.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button 
                  onClick={playBell} 
                  disabled={playing || !selectedAudioId || audios.length === 0}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Bunyikan
                </Button>
                {playing && (
                  <Button variant="destructive" onClick={stopBell}>
                    <VolumeX className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
            {audios.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-4">
                Belum ada audio. Hubungi admin untuk menambahkan audio.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Jadwal Hari Ini ({currentDay})
            </CardTitle>
            <CardDescription>Aktifkan/nonaktifkan jadwal bel</CardDescription>
          </CardHeader>
          <CardContent>
            {todaySchedules.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Tidak ada jadwal hari ini</p>
            ) : (
              <div className="space-y-2">
                {todaySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      schedule.time <= currentTime 
                        ? "bg-slate-100" 
                        : schedule.isActive 
                          ? "bg-green-50 border-green-200" 
                          : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-mono font-bold w-20">{schedule.time}</span>
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        {schedule.audioName && (
                          <p className="text-sm text-muted-foreground">{schedule.audioName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={() => toggleSchedule(schedule)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Schedules */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Semua Jadwal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Hari</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Belum ada jadwal
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell><Badge variant="outline">{schedule.day}</Badge></TableCell>
                        <TableCell className="font-mono">{schedule.time}</TableCell>
                        <TableCell>
                          <Badge variant={schedule.isActive ? "default" : "secondary"}>
                            {schedule.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// ==================== ADMIN DASHBOARD ====================
function AdminDashboard({ 
  identity, 
  schedules, 
  audios,
  accessCodes,
  onUpdate
}: { 
  identity: AppIdentity | null
  schedules: Schedule[]
  audios: Audio[]
  accessCodes: AccessCode[]
  onUpdate: () => void
}) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()

  // Auto bell engine
  const { lastTriggered, nextTrigger, currentStatus, stopAudio } = useAutoBellEngine(schedules, audios, true)

  const now = new Date()
  const dayIndex = now.getDay()
  const currentDay = DAYS[dayIndex === 0 ? 6 : dayIndex - 1]
  const currentTime = now.toTimeString().slice(0, 5)
  const todaySchedules = schedules.filter(s => s.day === currentDay && s.isActive)
  const nextSchedule = todaySchedules.find(s => s.time > currentTime)

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "identity", label: "Identitas", icon: Settings },
    { id: "schedules", label: "Jadwal", icon: Calendar },
    { id: "audios", label: "Audio", icon: Music },
    { id: "access", label: "Kode Akses", icon: Key }
  ]

  // Identity Form
  const IdentityForm = () => {
    const [schoolName, setSchoolName] = useState(identity?.schoolName || "")
    const [description, setDescription] = useState(identity?.description || "")
    const [address, setAddress] = useState(identity?.address || "")
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(identity?.logoUrl || null)

    useEffect(() => {
      if (identity) {
        setSchoolName(identity.schoolName || "")
        setDescription(identity.description || "")
        setAddress(identity.address || "")
        setPreview(identity.logoUrl || null)
      }
    }, [identity])

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setLogoFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result as string)
        reader.readAsDataURL(file)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      try {
        const formData = new FormData()
        formData.append("schoolName", schoolName)
        formData.append("description", description)
        formData.append("address", address)
        if (logoFile) formData.append("logo", logoFile)

        const res = await fetch("/api/identity", { method: "POST", body: formData })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.details || "Failed to save")
        }

        toast({ title: "Berhasil", description: "Identitas sekolah diperbarui" })
        setLogoFile(null) // Reset file after successful upload
        onUpdate()
      } catch (err) {
        toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            Identitas Sekolah
          </CardTitle>
          <CardDescription>Kelola informasi dan logo sekolah</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <label htmlFor="logo-input" className="block cursor-pointer">
                  <div className="w-40 h-40 border-2 border-dashed rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden hover:bg-slate-100 transition-colors hover:border-amber-400">
                    {preview ? (
                      <img src={preview} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Klik untuk upload</p>
                      </div>
                    )}
                  </div>
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoChange} 
                  className="hidden" 
                  id="logo-input"
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  PNG, JPG, JPEG (Max 5MB)
                </p>
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Nama Sekolah</Label>
                  <Input 
                    id="schoolName"
                    value={schoolName} 
                    onChange={(e) => setSchoolName(e.target.value)} 
                    placeholder="Nama Sekolah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi singkat tentang sekolah..."
                    className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input 
                    id="address"
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Alamat lengkap sekolah"
                  />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-amber-500 to-orange-600">
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Schedule Form
  const ScheduleForm = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: "", day: "Senin", time: "07:00", audioId: "" })
    const [loading, setLoading] = useState(false)

    const resetForm = () => {
      setFormData({ name: "", day: "Senin", time: "07:00", audioId: "" })
      setEditingSchedule(null)
    }

    const openEditDialog = (schedule: Schedule) => {
      setEditingSchedule(schedule)
      setFormData({
        name: schedule.name,
        day: schedule.day,
        time: schedule.time,
        audioId: schedule.audioId || ""
      })
      setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      try {
        const selectedAudio = audios.find(a => a.id === formData.audioId)
        const data = {
          ...(editingSchedule && { id: editingSchedule.id }),
          name: formData.name,
          day: formData.day,
          time: formData.time,
          audioId: formData.audioId || null,
          audioName: selectedAudio?.name || null
        }

        const res = await fetch("/api/schedules", {
          method: editingSchedule ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })

        if (!res.ok) throw new Error("Failed")

        toast({ title: "Berhasil", description: editingSchedule ? "Jadwal diperbarui" : "Jadwal ditambahkan" })
        setDialogOpen(false)
        resetForm()
        onUpdate()
      } catch {
        toast({ title: "Error", description: "Gagal menyimpan", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    const handleDelete = async () => {
      if (!deletingId) return
      setLoading(true)
      try {
        await fetch(`/api/schedules?id=${deletingId}`, { method: "DELETE" })
        toast({ title: "Berhasil", description: "Jadwal dihapus" })
        setDeleteDialogOpen(false)
        setDeletingId(null)
        onUpdate()
      } catch {
        toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    const toggleActive = async (schedule: Schedule) => {
      try {
        await fetch("/api/schedules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...schedule, isActive: !schedule.isActive })
        })
        onUpdate()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      }
    }

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Manajemen Jadwal
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSchedule ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nama Jadwal</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hari</Label>
                      <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Waktu</Label>
                      <Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Audio</Label>
                    <Select value={formData.audioId} onValueChange={(v) => setFormData({ ...formData, audioId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih audio" /></SelectTrigger>
                      <SelectContent>
                        {audios.map((audio) => (
                          <SelectItem key={audio.id} value={audio.id}>{audio.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading} className="bg-gradient-to-r from-amber-500 to-orange-600">
                      {loading ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Belum ada jadwal</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Hari</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Audio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell><Badge variant="outline">{schedule.day}</Badge></TableCell>
                      <TableCell className="font-mono">{schedule.time}</TableCell>
                      <TableCell>{schedule.audioName || "-"}</TableCell>
                      <TableCell>
                        <Switch checked={schedule.isActive} onCheckedChange={() => toggleActive(schedule)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(schedule)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { setDeletingId(schedule.id); setDeleteDialogOpen(true) }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Jadwal?</AlertDialogTitle>
              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    )
  }

  // Audio Form
  const AudioForm = () => {
    const [uploadName, setUploadName] = useState("")
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!uploadFile) return
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("audio", uploadFile)
        if (uploadName) formData.append("name", uploadName)

        const res = await fetch("/api/audios", { method: "POST", body: formData })
        if (!res.ok) throw new Error("Failed")

        toast({ title: "Berhasil", description: "Audio diupload" })
        setUploadName("")
        setUploadFile(null)
        onUpdate()
      } catch {
        toast({ title: "Error", description: "Gagal upload", variant: "destructive" })
      } finally {
        setUploading(false)
      }
    }

    const playAudio = (audio: Audio) => {
      if (playingId === audio.id) {
        audioRef.current?.pause()
        setPlayingId(null)
      } else {
        if (audioRef.current) audioRef.current.pause()
        audioRef.current = new Audio(audio.filePath)
        audioRef.current.play()
        setPlayingId(audio.id)
        audioRef.current.onended = () => setPlayingId(null)
      }
    }

    const handleDelete = async () => {
      if (!deletingId) return
      try {
        await fetch(`/api/audios?id=${deletingId}`, { method: "DELETE" })
        toast({ title: "Berhasil", description: "Audio dihapus" })
        setDeleteDialogOpen(false)
        setDeletingId(null)
        onUpdate()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      }
    }

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-500" />
              Upload Audio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Nama (opsional)" />
                </div>
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input type="file" accept="audio/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={uploading || !uploadFile} className="w-full bg-gradient-to-r from-amber-500 to-orange-600">
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-amber-500" />
              Daftar Audio ({audios.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {audios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Belum ada audio</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {audios.map((audio) => (
                  <div key={audio.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="rounded-full" onClick={() => playAudio(audio)}>
                          {playingId === audio.id ? <span className="w-4 h-4 bg-amber-500 rounded-sm" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <div>
                          <p className="font-medium">{audio.name}</p>
                          <p className="text-sm text-muted-foreground">{formatSize(audio.size)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { setDeletingId(audio.id); setDeleteDialogOpen(true) }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Audio?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Access Code Form
  const AccessCodeForm = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ code: "", name: "" })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      try {
        await fetch("/api/access-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        })
        toast({ title: "Berhasil", description: "Kode akses dibuat" })
        setDialogOpen(false)
        setFormData({ code: "", name: "" })
        onUpdate()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    const handleDelete = async () => {
      if (!deletingId) return
      try {
        await fetch(`/api/access-code?id=${deletingId}`, { method: "DELETE" })
        toast({ title: "Berhasil", description: "Kode dihapus" })
        setDeleteDialogOpen(false)
        setDeletingId(null)
        onUpdate()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      }
    }

    const toggleActive = async (code: AccessCode) => {
      try {
        await fetch("/api/access-code", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: code.id, isActive: !code.isActive })
        })
        onUpdate()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      }
    }

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Kode Akses Petugas
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Kode
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Kode Akses Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Kode Akses</Label>
                    <Input 
                      value={formData.code} 
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} 
                      placeholder="contoh: PETUGAS2024"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Petugas</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading} className="bg-gradient-to-r from-amber-500 to-orange-600">
                      {loading ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {accessCodes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Belum ada kode akses</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-bold">{code.code}</TableCell>
                      <TableCell>{code.name}</TableCell>
                      <TableCell>
                        <Switch checked={code.isActive} onCheckedChange={() => toggleActive(code)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { setDeletingId(code.id); setDeleteDialogOpen(true) }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Kode Akses?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    )
  }

  // Dashboard Content
  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {identity?.logoUrl ? (
            <img src={identity.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg" />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <School className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{identity?.schoolName || "Sekolah"}</h1>
            {identity?.address && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" />{identity.address}</p>}
          </div>
        </div>
      </div>

      {/* Clock */}
      <Card className="border-0 shadow-lg">
        <CardContent className="py-8">
          <RealTimeClock />
        </CardContent>
      </Card>

      {/* Auto Bell Status */}
      <Card className={`border-0 shadow-lg ${currentStatus === "playing" ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : ""}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${currentStatus === "playing" ? "text-white/80" : "text-muted-foreground"}`}>
                Auto Bell Engine
              </p>
              <div className="flex items-center gap-2">
                <p className={`text-xl font-bold ${currentStatus === "playing" ? "text-white" : ""}`}>
                  {currentStatus === "playing" ? "🔔 BEL BERBUNYI!" : "Status: Aktif"}
                </p>
              </div>
              {nextTrigger && <p className="text-sm mt-1">Jadwal berikutnya: {nextTrigger}</p>}
              {lastTriggered && <p className="text-sm opacity-70">Terakhir: {lastTriggered}</p>}
            </div>
            {currentStatus === "playing" && (
              <Button variant="secondary" onClick={stopAudio}>
                <VolumeX className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jadwal</p>
                <p className="text-3xl font-bold text-amber-600">{schedules.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jadwal Hari Ini</p>
                <p className="text-3xl font-bold text-green-600">{todaySchedules.length}</p>
              </div>
              <Clock className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Audio</p>
                <p className="text-3xl font-bold text-purple-600">{audios.length}</p>
              </div>
              <Music className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jadwal Aktif</p>
                <p className="text-3xl font-bold text-blue-600">{schedules.filter(s => s.isActive).length}</p>
              </div>
              <Power className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Schedule */}
      {nextSchedule && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Jadwal Berikutnya</p>
                <p className="text-2xl font-bold">{nextSchedule.name}</p>
                <p className="opacity-80">{nextSchedule.time} - {nextSchedule.day}</p>
              </div>
              <Bell className="w-12 h-12 opacity-50" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            Jadwal Hari Ini ({currentDay})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tidak ada jadwal hari ini</p>
          ) : (
            <div className="space-y-2">
              {todaySchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    schedule.time <= currentTime ? "bg-slate-100 text-muted-foreground" : "bg-white border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-bold">{schedule.time}</span>
                    <span>{schedule.name}</span>
                    {schedule.audioName && (
                      <Badge variant="secondary" className="text-xs">
                        <Music className="w-3 h-3 mr-1" />
                        {schedule.audioName}
                      </Badge>
                    )}
                  </div>
                  {schedule.time <= currentTime && <Badge variant="outline" className="text-xs">Selesai</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Bel Sekolah</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === item.id ? "bg-amber-50 text-amber-700 font-medium" : "text-muted-foreground hover:bg-slate-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-medium">
              {session?.user?.name?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{session?.user?.name || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
            <span className="font-bold">Bel Sekolah</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold">Admin Panel</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === item.id ? "bg-amber-50 text-amber-700 font-medium" : "text-muted-foreground hover:bg-slate-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-0 pt-16 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {activeTab === "dashboard" && <DashboardContent />}
          {activeTab === "identity" && <IdentityForm />}
          {activeTab === "schedules" && <ScheduleForm />}
          {activeTab === "audios" && <AudioForm />}
          {activeTab === "access" && <AccessCodeForm />}
        </div>
      </main>
    </div>
  )
}

// ==================== MAIN PAGE ====================
export default function Page() {
  const { status } = useSession()
  const [view, setView] = useState<"guest" | "admin-login" | "petugas-login" | "petugas" | "admin">("guest")
  const [petugasName, setPetugasName] = useState<string | null>(null)
  const [identity, setIdentity] = useState<AppIdentity | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [audios, setAudios] = useState<Audio[]>([])
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [loading, setLoading] = useState(true)

  // Seed database on first load
  useEffect(() => {
    fetch("/api/seed").catch(console.error)
  }, [])

  // Fetch all data
  const fetchData = async () => {
    try {
      const [identityRes, schedulesRes, audiosRes, codesRes] = await Promise.all([
        fetch("/api/identity"),
        fetch("/api/schedules"),
        fetch("/api/audios"),
        fetch("/api/access-code")
      ])

      if (identityRes.ok) setIdentity(await identityRes.json())
      if (schedulesRes.ok) setSchedules(await schedulesRes.json())
      if (audiosRes.ok) setAudios(await audiosRes.json())
      if (codesRes.ok) setAccessCodes(await codesRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handle session status
  useEffect(() => {
    if (status === "authenticated") {
      setView("admin")
    } else if (status === "unauthenticated" && view === "admin") {
      setView("guest")
    }
  }, [status, view])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    )
  }

  // Guest Page
  if (view === "guest") {
    return (
      <GuestPage 
        identity={identity} 
        onAdminLogin={() => setView("admin-login")}
        onPetugasLogin={() => setView("petugas-login")}
      />
    )
  }

  // Admin Login
  if (view === "admin-login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <AdminLoginForm onClose={() => setView("guest")} />
      </div>
    )
  }

  // Petugas Login
  if (view === "petugas-login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <PetugasLoginForm 
          onSuccess={(name) => {
            setPetugasName(name)
            setView("petugas")
          }}
        />
      </div>
    )
  }

  // Petugas Dashboard
  if (view === "petugas" && petugasName) {
    return (
      <PetugasDashboard
        schedules={schedules}
        audios={audios}
        petugasName={petugasName}
        onLogout={() => { setPetugasName(null); setView("guest") }}
        onUpdate={fetchData}
      />
    )
  }

  // Admin Dashboard
  if (view === "admin" && status === "authenticated") {
    return (
      <AdminDashboard
        identity={identity}
        schedules={schedules}
        audios={audios}
        accessCodes={accessCodes}
        onUpdate={fetchData}
      />
    )
  }

  return null
}
