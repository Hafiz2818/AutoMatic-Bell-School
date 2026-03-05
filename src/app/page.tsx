"use client"

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Home, Power, Lock, User, Key, VolumeX, UserPlus, Sun, Moon, 
  Palette, Building2, Users, Sparkles, ArrowLeft, Globe
} from "lucide-react"

// ==================== THEME CONTEXT ====================
type ThemeColor = "emerald" | "amber" | "rose" | "blue" | "violet" | "cyan"

type ThemeContextType = {
  theme: ThemeColor
  setTheme: (theme: ThemeColor) => void
  isDark: boolean
  setIsDark: (dark: boolean) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "emerald",
  setTheme: () => {},
  isDark: true,
  setIsDark: () => {}
})

const themeColors: Record<ThemeColor, { primary: string; secondary: string; accent: string; gradient: string }> = {
  emerald: { primary: "emerald", secondary: "teal", accent: "green", gradient: "from-emerald-500 to-teal-600" },
  amber: { primary: "amber", secondary: "orange", accent: "yellow", gradient: "from-amber-500 to-orange-600" },
  rose: { primary: "rose", secondary: "pink", accent: "red", gradient: "from-rose-500 to-pink-600" },
  blue: { primary: "blue", secondary: "cyan", accent: "sky", gradient: "from-blue-500 to-cyan-600" },
  violet: { primary: "violet", secondary: "purple", accent: "indigo", gradient: "from-violet-500 to-purple-600" },
  cyan: { primary: "cyan", secondary: "teal", accent: "sky", gradient: "from-cyan-500 to-teal-600" }
}

// ==================== TYPES ====================
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

type PublicSchool = {
  id: string
  schoolName: string
  description?: string
  address?: string
  logoUrl?: string
  adminName: string
  registeredAt: string
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]

// ==================== REAL-TIME CLOCK ====================
function RealTimeClock({ large = false, themeGradient = "from-emerald-500 to-teal-600" }: { large?: boolean; themeGradient?: string }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center">
      <div className={`${large ? 'text-5xl md:text-7xl' : 'text-3xl md:text-5xl'} font-bold tracking-tight`}>
        <span className={`bg-gradient-to-r ${themeGradient} bg-clip-text text-transparent`}>
          {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
      <div className={`${large ? 'text-lg md:text-xl' : 'text-sm md:text-base'} text-muted-foreground mt-2 font-medium`}>
        {time.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  )
}

// ==================== AUTO BELL ENGINE ====================
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

    if (currentSecond > 5) return

    const matchingSchedule = todaySchedules.find(s => s.time === currentTime)
    
    if (matchingSchedule && !triggeredRef.current.has(triggerKey)) {
      triggeredRef.current.add(triggerKey)
      
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
          toast({ title: "🔔 Bel Otomatis", description: `${matchingSchedule.name} - ${currentTime}` })
        }).catch(err => {
          console.error("Audio play error:", err)
        })

        audioRef.current.onended = () => setCurrentStatus("idle")
      }
    }

    if (currentTime === "00:00" && currentSecond === 0) {
      triggeredRef.current.clear()
    }
  }, [schedules, audios])

  useEffect(() => {
    if (!isEnabled) return
    const interval = setInterval(checkSchedule, 1000)
    // Use setTimeout to defer initial check and avoid cascading renders
    const timeout = setTimeout(checkSchedule, 0)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
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

// ==================== THEME SELECTOR ====================
function ThemeSelector() {
  const { theme, setTheme, isDark, setIsDark } = useContext(ThemeContext)
  const themes: ThemeColor[] = ["emerald", "amber", "rose", "blue", "violet", "cyan"]

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full p-1">
        {themes.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`w-6 h-6 rounded-full transition-all duration-300 ${
              theme === t ? `ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110` : "opacity-70 hover:opacity-100"
            } bg-gradient-to-br ${themeColors[t].gradient}`}
            title={t.charAt(0).toUpperCase() + t.slice(1)}
          />
        ))}
      </div>
      <button
        onClick={() => setIsDark(!isDark)}
        className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
      >
        {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>
    </div>
  )
}

// ==================== GUEST PAGE ====================
function GuestPage({ 
  onAdminLogin, 
  onPetugasLogin, 
  onRegister,
  schools,
  isAuthenticated,
  onGoToDashboard
}: { 
  onAdminLogin: () => void
  onPetugasLogin: () => void
  onRegister: () => void
  schools: PublicSchool[]
  isAuthenticated?: boolean
  onGoToDashboard?: () => void
}) {
  const { theme, isDark } = useContext(ThemeContext)
  const currentTheme = themeColors[theme]

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900` 
        : `bg-gradient-to-br from-slate-50 via-white to-slate-100`
    } flex flex-col`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${currentTheme.gradient} animate-pulse`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${currentTheme.gradient} animate-pulse`} style={{ animationDelay: "1s" }} />
      </div>

      {/* Header */}
      <header className={`relative z-10 border-b backdrop-blur-xl ${isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white/50"}`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-gradient-to-br ${currentTheme.gradient} rounded-xl shadow-lg shadow-${currentTheme.primary}-500/20`}>
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Bel Sekolah Otomatis</h1>
              <p className={`text-xs ${isDark ? "text-white/60" : "text-slate-500"}`}>Sistem Bel Digital Modern</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSelector />
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="outline" 
                  className={`bg-transparent ${isDark ? "border-white/30 text-white hover:bg-white/10 hover:text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"} hidden sm:flex`}
                  onClick={onPetugasLogin}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Petugas
                </Button>
                <Button 
                  variant="outline" 
                  className={`bg-transparent ${isDark ? "border-white/30 text-white hover:bg-white/10 hover:text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"} hidden sm:flex`}
                  onClick={onRegister}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Daftar
                </Button>
                <Button 
                  className={`bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg shadow-${currentTheme.primary}-500/25`}
                  onClick={onAdminLogin}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </>
            ) : (
              <Button 
                className={`bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg shadow-${currentTheme.primary}-500/25`}
                onClick={onGoToDashboard}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
                isDark ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-600"
              }`}>
                <Sparkles className={`w-4 h-4 text-${currentTheme.primary}-500`} />
                <span className="text-sm font-medium">Platform Bel Sekolah Terbaik</span>
              </div>
              
              <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-800"}`}>
                Sistem <span className={`bg-gradient-to-r ${currentTheme.gradient} bg-clip-text text-transparent`}>Bel Sekolah</span> Otomatis
              </h1>
              
              <p className={`text-lg md:text-xl mb-8 max-w-2xl mx-auto ${isDark ? "text-white/70" : "text-slate-600"}`}>
                Kelola jadwal bel sekolah dengan mudah dan efisien. Sistem otomatis yang memutar audio bel sesuai jadwal yang telah ditentukan.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                {!isAuthenticated ? (
                  <>
                    <Button 
                      size="lg" 
                      className={`bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg shadow-${currentTheme.primary}-500/25`}
                      onClick={onRegister}
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Daftar Sekarang
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className={`bg-transparent ${isDark ? "border-white/30 text-white hover:bg-white/10 hover:text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                      onClick={onAdminLogin}
                    >
                      Sudah Punya Akun? Masuk
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="lg" 
                    className={`bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg shadow-${currentTheme.primary}-500/25`}
                    onClick={onGoToDashboard}
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Buka Dashboard
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Clock Section */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <Card className={`max-w-2xl mx-auto border-0 shadow-2xl ${
              isDark ? "bg-white/10 backdrop-blur-xl" : "bg-white shadow-slate-200/50"
            }`}>
              <CardContent className="py-10">
                <RealTimeClock large themeGradient={currentTheme.gradient} />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Bell, title: "Bel Otomatis", desc: "Sistem bel otomatis berdasarkan jadwal yang ditentukan", color: themeColors.emerald.gradient },
                { icon: Calendar, title: "Jadwal Fleksibel", desc: "Atur jadwal bel per hari dan waktu sesuai kebutuhan", color: themeColors.blue.gradient },
                { icon: Music, title: "Audio Kustom", desc: "Upload dan gunakan audio bel sesuai keinginan", color: themeColors.violet.gradient }
              ].map((feature, i) => (
                <Card 
                  key={i}
                  className={`border-0 transition-all duration-300 hover:scale-105 ${
                    isDark 
                      ? "bg-white/10 backdrop-blur hover:bg-white/15" 
                      : "bg-white shadow-lg shadow-slate-200/50 hover:shadow-xl"
                  }`}
                >
                  <CardContent className="pt-6 text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>{feature.title}</h3>
                    <p className={`text-sm mt-2 ${isDark ? "text-white/60" : "text-slate-500"}`}>{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Registered Schools */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>
                  Sekolah Terdaftar
                </h2>
                <p className={`${isDark ? "text-white/60" : "text-slate-500"}`}>
                  Daftar sekolah yang sudah menggunakan sistem bel otomatis
                </p>
              </div>

              {schools.length === 0 ? (
                <Card className={`border-0 ${isDark ? "bg-white/10 backdrop-blur" : "bg-white shadow-lg"}`}>
                  <CardContent className="py-12 text-center">
                    <Building2 className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-white/30" : "text-slate-300"}`} />
                    <p className={isDark ? "text-white/60" : "text-slate-500"}>Belum ada sekolah terdaftar</p>
                    {!isAuthenticated && (
                      <Button 
                        className={`mt-4 bg-gradient-to-r ${currentTheme.gradient} text-white`}
                        onClick={onRegister}
                      >
                        Jadilah yang pertama mendaftar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schools.map((school, i) => (
                    <Card 
                      key={school.id}
                      className={`border-0 transition-all duration-300 hover:scale-[1.02] ${
                        isDark 
                          ? "bg-white/10 backdrop-blur hover:bg-white/15" 
                          : "bg-white shadow-lg shadow-slate-200/50 hover:shadow-xl"
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            school.logoUrl 
                              ? "bg-slate-100" 
                              : `bg-gradient-to-br ${currentTheme.gradient}`
                          }`}>
                            {school.logoUrl ? (
                              <img src={school.logoUrl} alt={school.schoolName} className="w-12 h-12 object-contain rounded-lg" />
                            ) : (
                              <School className="w-7 h-7 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-slate-800"}`}>
                              {school.schoolName}
                            </h3>
                            {school.description && (
                              <p className={`text-sm mt-1 line-clamp-2 ${isDark ? "text-white/60" : "text-slate-500"}`}>
                                {school.description}
                              </p>
                            )}
                            {school.address && (
                              <div className={`flex items-center gap-1 mt-2 text-xs ${isDark ? "text-white/50" : "text-slate-400"}`}>
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{school.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 border-t py-6 ${
        isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white/50"
      }`}>
        <div className="container mx-auto px-4 text-center">
          <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-500"}`}>
            © 2024 Sistem Bel Sekolah Otomatis | Kelola bel sekolah dengan mudah
          </p>
        </div>
      </footer>

      {/* Mobile Action Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 sm:hidden z-50">
        {!isAuthenticated ? (
          <>
            <Button 
              size="icon"
              className={`rounded-full bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg`}
              onClick={onRegister}
            >
              <UserPlus className="w-5 h-5" />
            </Button>
            <Button 
              size="icon"
              variant="outline"
              className={`rounded-full bg-transparent ${isDark ? "border-white/30 text-white hover:bg-white/10" : "border-slate-300 bg-white text-slate-700"}`}
              onClick={onPetugasLogin}
            >
              <Key className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <Button 
            size="icon"
            className={`rounded-full bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg`}
            onClick={onGoToDashboard}
          >
            <Home className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ==================== LOGIN FORM ====================
function LoginForm({ onClose, onSwitchRegister }: { onClose: () => void; onSwitchRegister: () => void }) {
  const { theme, isDark } = useContext(ThemeContext)
  const currentTheme = themeColors[theme]
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
        toast({ title: "Login Gagal", description: "Email atau password salah", variant: "destructive" })
      } else {
        toast({ title: "Login Berhasil", description: "Selamat datang!" })
        onClose()
      }
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`w-full max-w-md border-0 shadow-2xl ${isDark ? "bg-slate-800/90 backdrop-blur-xl" : "bg-white"}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-3 bg-gradient-to-br ${currentTheme.gradient} rounded-xl shadow-lg`}>
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className={isDark ? "text-white" : ""}>Login Admin</CardTitle>
        <CardDescription>Masuk ke dashboard admin</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className={isDark ? "text-white/80" : ""}>Email</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="email@sekolah.com" 
              className={isDark ? "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" : ""}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label className={isDark ? "text-white/80" : ""}>Password</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className={isDark ? "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" : ""}
              required 
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading} 
            className={`w-full bg-gradient-to-r ${currentTheme.gradient} text-white`}
          >
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onSwitchRegister} className={`text-${currentTheme.primary}-600`}>
            Belum punya akun? Daftar
          </Button>
        </div>
        <Button variant="outline" onClick={onClose} className={`w-full mt-2 bg-transparent ${isDark ? "border-slate-600 text-white hover:bg-slate-700 hover:text-white" : ""}`}>
          Batal
        </Button>
      </CardContent>
    </Card>
  )
}

// ==================== REGISTER FORM ====================
function RegisterForm({ onClose, onSwitchLogin }: { onClose: () => void; onSwitchLogin: () => void }) {
  const { theme, isDark } = useContext(ThemeContext)
  const currentTheme = themeColors[theme]
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" })
      return
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Registrasi gagal")
      }

      toast({ 
        title: "Registrasi Berhasil", 
        description: `Akun berhasil dibuat. Kode Petugas: ${data.defaultAccessCode}` 
      })
      
      await signIn("credentials", {
        email,
        password,
        redirect: false
      })
      
      onClose()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Registrasi gagal", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`w-full max-w-md border-0 shadow-2xl ${isDark ? "bg-slate-800/90 backdrop-blur-xl" : "bg-white"}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-3 bg-gradient-to-br ${currentTheme.gradient} rounded-xl shadow-lg`}>
            <UserPlus className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className={isDark ? "text-white" : ""}>Daftar Akun Baru</CardTitle>
        <CardDescription>Buat akun untuk mengelola bel sekolah Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className={isDark ? "text-white/80" : ""}>Nama</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Nama Anda" 
              className={isDark ? "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" : ""}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label className={isDark ? "text-white/80" : ""}>Email</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="email@sekolah.com" 
              className={isDark ? "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" : ""}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label className={isDark ? "text-white/80" : ""}>Password</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Minimal 6 karakter" 
              className={isDark ? "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" : ""}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label className={isDark ? "text-white/80" : ""}>Konfirmasi Password</Label>
            <Input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Ulangi password" 
              className={isDark ? "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" : ""}
              required 
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading} 
            className={`w-full bg-gradient-to-r ${currentTheme.gradient} text-white`}
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onSwitchLogin} className={`text-${currentTheme.primary}-600`}>
            Sudah punya akun? Login
          </Button>
        </div>
        <Button variant="outline" onClick={onClose} className={`w-full mt-2 bg-transparent ${isDark ? "border-slate-600 text-white hover:bg-slate-700 hover:text-white" : ""}`}>
          Batal
        </Button>
      </CardContent>
    </Card>
  )
}

// ==================== PETUGAS LOGIN FORM ====================
function PetugasLoginForm({ onSuccess }: { onSuccess: (data: { name: string; userId: string; schoolName: string }) => void }) {
  const { theme, isDark } = useContext(ThemeContext)
  const currentTheme = themeColors[theme]
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/access-code", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Kode tidak valid")
      }

      toast({ title: "Akses Diterima", description: `Selamat datang, ${data.name}` })
      onSuccess(data)
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Kode tidak valid", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`w-full max-w-md border-0 shadow-2xl ${isDark ? "bg-slate-800/90 backdrop-blur-xl" : "bg-white"}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-3 bg-gradient-to-br ${currentTheme.gradient} rounded-xl shadow-lg`}>
            <Key className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className={isDark ? "text-white" : ""}>Akses Petugas</CardTitle>
        <CardDescription>Masukkan kode akses</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className={isDark ? "text-white/80" : ""}>Kode Akses</Label>
            <Input 
              value={code} 
              onChange={(e) => setCode(e.target.value.toUpperCase())} 
              placeholder="KODE AKSES" 
              className={`text-center text-lg tracking-widest ${isDark ? "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" : ""}`}
              required 
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading} 
            className={`w-full bg-gradient-to-r ${currentTheme.gradient} text-white`}
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-4">Dapatkan kode dari admin sekolah</p>
      </CardContent>
    </Card>
  )
}

// ==================== PETUGAS DASHBOARD ====================
function PetugasDashboard({ 
  schedules, 
  audios, 
  petugasData,
  onLogout,
  onRefresh
}: { 
  schedules: Schedule[]
  audios: Audio[]
  petugasData: { name: string; userId: string; schoolName: string }
  onLogout: () => void
  onRefresh: () => void
}) {
  const { theme } = useContext(ThemeContext)
  const currentTheme = themeColors[theme]
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

    if (audioRef.current) audioRef.current.pause()
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
      await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...schedule, isActive: !schedule.isActive })
      })
      toast({ title: schedule.isActive ? "Jadwal Dinonaktifkan" : "Jadwal Diaktifkan" })
      onRefresh()
    } catch {
      toast({ title: "Error", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-br ${currentTheme.gradient} rounded-xl`}>
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">{petugasData.schoolName}</h1>
              <p className="text-sm text-muted-foreground">Petugas: {petugasData.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardContent className="py-8">
            <RealTimeClock themeGradient={currentTheme.gradient} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className={`w-5 h-5 text-${currentTheme.primary}-500`} />
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
                  className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Bunyikan
                </Button>
                {playing && <Button variant="destructive" onClick={stopBell}><VolumeX className="w-4 h-4 mr-2" />Stop</Button>}
              </div>
            </div>
            {audios.length === 0 && <p className="text-center text-muted-foreground text-sm mt-4">Hubungi admin untuk menambahkan audio.</p>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 text-${currentTheme.primary}-500`} />
              Jadwal Hari Ini ({currentDay})
            </CardTitle>
            <CardDescription>Aktifkan/nonaktifkan jadwal</CardDescription>
          </CardHeader>
          <CardContent>
            {todaySchedules.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Tidak ada jadwal</p>
            ) : (
              <div className="space-y-2">
                {todaySchedules.map((schedule) => (
                  <div key={schedule.id} className={`flex items-center justify-between p-4 rounded-xl border ${
                    schedule.time <= currentTime 
                      ? "bg-slate-100" 
                      : schedule.isActive 
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" 
                        : "bg-red-50 border-red-200"
                  }`}>
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-mono font-bold w-20">{schedule.time}</span>
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        {schedule.audioName && <p className="text-sm text-muted-foreground">{schedule.audioName}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>{schedule.isActive ? "Aktif" : "Nonaktif"}</Badge>
                      <Switch checked={schedule.isActive} onCheckedChange={() => toggleSchedule(schedule)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader><CardTitle>Semua Jadwal</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Nama</TableHead>
                    <TableHead>Hari</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada jadwal</TableCell></TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell><Badge variant="outline">{schedule.day}</Badge></TableCell>
                        <TableCell className="font-mono">{schedule.time}</TableCell>
                        <TableCell><Badge variant={schedule.isActive ? "default" : "secondary"}>{schedule.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
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
  onUpdate,
  onBackToHome 
}: { 
  onUpdate: () => void
  onBackToHome: () => void
}) {
  const { theme } = useContext(ThemeContext)
  const currentTheme = themeColors[theme]
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [identity, setIdentity] = useState<AppIdentity | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [audios, setAudios] = useState<Audio[]>([])
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession()

  const { lastTriggered, nextTrigger, currentStatus, stopAudio } = useAutoBellEngine(schedules, audios, true)

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

  const handleLogout = async () => {
    // Deactivate all access codes before logout
    try {
      for (const code of accessCodes) {
        if (code.isActive) {
          await fetch("/api/access-code", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: code.id, isActive: false })
          })
        }
      }
    } catch (error) {
      console.error("Error deactivating codes:", error)
    }
    
    await signOut({ callbackUrl: "/" })
  }

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

  // Identity Form Component
  const IdentityForm = () => {
    const [schoolName, setSchoolName] = useState(identity?.schoolName || "")
    const [description, setDescription] = useState(identity?.description || "")
    const [address, setAddress] = useState(identity?.address || "")
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [formLoading, setFormLoading] = useState(false)
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
      setFormLoading(true)
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
        setLogoFile(null)
        fetchData()
      } catch (err) {
        toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui", variant: "destructive" })
      } finally {
        setFormLoading(false)
      }
    }

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className={`w-5 h-5 text-${currentTheme.primary}-500`} />
            Identitas Sekolah
          </CardTitle>
          <CardDescription>Kelola informasi sekolah Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <label htmlFor="logo-input" className="block cursor-pointer">
                  <div className={`w-40 h-40 border-2 border-dashed rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden hover:from-slate-100 hover:to-slate-200 transition-colors hover:border-${currentTheme.primary}-400`}>
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
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-input" />
                <p className="text-xs text-muted-foreground text-center mt-2">PNG, JPG (Max 5MB)</p>
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>Nama Sekolah</Label>
                  <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Nama Sekolah" />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Deskripsi sekolah..." 
                    className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat sekolah" />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={formLoading} className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}>
              {formLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Schedule Form Component
  const ScheduleForm = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: "", day: "Senin", time: "07:00", audioId: "" })
    const [formLoading, setFormLoading] = useState(false)

    const resetForm = () => {
      setFormData({ name: "", day: "Senin", time: "07:00", audioId: "" })
      setEditingSchedule(null)
    }

    const openEditDialog = (schedule: Schedule) => {
      setEditingSchedule(schedule)
      setFormData({ name: schedule.name, day: schedule.day, time: schedule.time, audioId: schedule.audioId || "" })
      setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setFormLoading(true)
      try {
        const selectedAudio = audios.find(a => a.id === formData.audioId)
        const body = {
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
          body: JSON.stringify(body)
        })

        if (!res.ok) throw new Error("Failed")

        toast({ title: "Berhasil", description: editingSchedule ? "Jadwal diperbarui" : "Jadwal ditambahkan" })
        setDialogOpen(false)
        resetForm()
        fetchData()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      } finally {
        setFormLoading(false)
      }
    }

    const handleDelete = async () => {
      if (!deletingId) return
      setFormLoading(true)
      try {
        await fetch(`/api/schedules?id=${deletingId}`, { method: "DELETE" })
        toast({ title: "Berhasil", description: "Jadwal dihapus" })
        setDeletingId(null)
        fetchData()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      } finally {
        setFormLoading(false)
      }
    }

    const toggleActive = async (schedule: Schedule) => {
      try {
        await fetch("/api/schedules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...schedule, isActive: !schedule.isActive })
        })
        fetchData()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      }
    }

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 text-${currentTheme.primary}-500`} />
              Manajemen Jadwal
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
              <DialogTrigger asChild>
                <Button className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}>
                  <Plus className="w-4 h-4 mr-2" />Tambah
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingSchedule ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>Nama Jadwal</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Hari</Label>
                      <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DAYS.map((day) => (<SelectItem key={day} value={day}>{day}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Waktu</Label><Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Audio</Label>
                    <Select value={formData.audioId} onValueChange={(v) => setFormData({ ...formData, audioId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih audio" /></SelectTrigger>
                      <SelectContent>{audios.map((audio) => (<SelectItem key={audio.id} value={audio.id}>{audio.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <DialogFooter><Button type="submit" disabled={formLoading} className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}>{formLoading ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
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
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
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
                      <TableCell><Switch checked={schedule.isActive} onCheckedChange={() => toggleActive(schedule)} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(schedule)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeletingId(schedule.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Hapus Jadwal?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500">Hapus</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    )
  }

  // Audio Form Component
  const AudioForm = () => {
    const [uploadName, setUploadName] = useState("")
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const playAudio = (audio: Audio) => {
      if (audioRef.current) audioRef.current.pause()
      audioRef.current = new Audio(audio.filePath)
      audioRef.current.play()
      setPlayingId(audio.id)
      audioRef.current.onended = () => setPlayingId(null)
    }

    const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!uploadFile) return
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("audio", uploadFile)
        formData.append("name", uploadName)
        const res = await fetch("/api/audios", { method: "POST", body: formData })
        if (!res.ok) throw new Error("Upload failed")
        toast({ title: "Berhasil", description: "Audio diupload" })
        setUploadName("")
        setUploadFile(null)
        fetchData()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      } finally {
        setUploading(false)
      }
    }

    const handleDelete = async () => {
      if (!deletingId) return
      setUploading(true)
      try {
        await fetch(`/api/audios?id=${deletingId}`, { method: "DELETE" })
        toast({ title: "Berhasil", description: "Audio dihapus" })
        setDeletingId(null)
        fetchData()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      } finally {
        setUploading(false)
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
              <Upload className={`w-5 h-5 text-${currentTheme.primary}-500`} />
              Upload Audio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Nama</Label><Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Nama (opsional)" /></div>
                <div className="space-y-2"><Label>File</Label><Input type="file" accept="audio/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required /></div>
                <div className="flex items-end">
                  <Button type="submit" disabled={uploading || !uploadFile} className={`w-full bg-gradient-to-r ${currentTheme.gradient} text-white`}>
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
              <Music className={`w-5 h-5 text-${currentTheme.primary}-500`} />
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
                  <div key={audio.id} className="border rounded-xl p-4 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className={`rounded-full ${playingId === audio.id ? `bg-gradient-to-r ${currentTheme.gradient} text-white border-0` : ""}`}
                          onClick={() => playAudio(audio)}
                        >
                          {playingId === audio.id ? <span className="w-4 h-4 bg-white rounded-sm" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <div>
                          <p className="font-medium">{audio.name}</p>
                          <p className="text-sm text-muted-foreground">{formatSize(audio.size)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeletingId(audio.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Hapus Audio?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500">Hapus</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Access Code Form Component
  const AccessCodeForm = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ code: "", name: "" })
    const [formLoading, setFormLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setFormLoading(true)
      try {
        await fetch("/api/access-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        })
        toast({ title: "Berhasil", description: "Kode akses dibuat" })
        setDialogOpen(false)
        setFormData({ code: "", name: "" })
        fetchData()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      } finally {
        setFormLoading(false)
      }
    }

    const handleDelete = async () => {
      if (!deletingId) return
      try {
        await fetch(`/api/access-code?id=${deletingId}`, { method: "DELETE" })
        toast({ title: "Berhasil", description: "Kode dihapus" })
        setDeletingId(null)
        fetchData()
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
        fetchData()
      } catch {
        toast({ title: "Error", variant: "destructive" })
      }
    }

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className={`w-5 h-5 text-${currentTheme.primary}-500`} />
              Kode Akses Petugas
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}>
                  <Plus className="w-4 h-4 mr-2" />Tambah Kode
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Buat Kode Akses</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>Kode Akses</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="PETUGAS2024" required /></div>
                  <div className="space-y-2"><Label>Nama Petugas</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                  <DialogFooter><Button type="submit" disabled={formLoading} className={`bg-gradient-to-r ${currentTheme.gradient} text-white`}>{formLoading ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
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
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
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
                      <TableCell><Switch checked={code.isActive} onCheckedChange={() => toggleActive(code)} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeletingId(code.id)}>
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
        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Hapus Kode?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500">Hapus</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    )
  }

  // Dashboard Content
  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {identity?.logoUrl ? (
            <img src={identity.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-xl" />
          ) : (
            <div className={`w-16 h-16 bg-gradient-to-br ${currentTheme.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
              <School className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{identity?.schoolName || "Sekolah Saya"}</h1>
            {identity?.address && (
              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="w-4 h-4" />{identity.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Clock */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
        <CardContent className="py-8">
          <RealTimeClock themeGradient={currentTheme.gradient} />
        </CardContent>
      </Card>

      {/* Auto Bell Status */}
      <Card className={`border-0 shadow-lg ${currentStatus === "playing" ? `bg-gradient-to-r ${currentTheme.gradient} text-white` : "bg-gradient-to-br from-white to-slate-50"}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${currentStatus === "playing" ? "text-white/80" : "text-muted-foreground"}`}>Auto Bell Engine</p>
              <p className={`text-xl font-bold ${currentStatus === "playing" ? "text-white" : "text-slate-800"}`}>
                {currentStatus === "playing" ? "🔔 BEL BERBUNYI!" : "Status: Aktif"}
              </p>
              {nextTrigger && <p className="text-sm mt-1">Jadwal berikutnya: {nextTrigger}</p>}
              {lastTriggered && <p className="text-sm opacity-70">Terakhir: {lastTriggered}</p>}
            </div>
            {currentStatus === "playing" && (
              <Button variant="secondary" onClick={stopAudio}>
                <VolumeX className="w-4 h-4 mr-2" />Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 text-${currentTheme.primary}-500`} />
            Jadwal Hari Ini ({currentDay})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tidak ada jadwal hari ini</p>
          ) : (
            <div className="space-y-2">
              {todaySchedules.sort((a, b) => a.time.localeCompare(b.time)).map((schedule) => (
                <div key={schedule.id} className={`flex items-center justify-between p-4 rounded-xl ${
                  schedule.time <= currentTime 
                    ? "bg-slate-100 text-muted-foreground" 
                    : "bg-gradient-to-r from-white to-slate-50 border shadow-sm"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-bold">{schedule.time}</span>
                    <span>{schedule.name}</span>
                    {schedule.audioName && (
                      <Badge variant="secondary" className="text-xs">
                        <Music className="w-3 h-3 mr-1" />{schedule.audioName}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${currentTheme.primary}-500`} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-br ${currentTheme.gradient} rounded-xl`}>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeTab === item.id 
                  ? `bg-gradient-to-r ${currentTheme.gradient} text-white font-medium shadow-lg` 
                  : "text-muted-foreground hover:bg-slate-100"
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
            <div className={`w-10 h-10 bg-gradient-to-br ${currentTheme.gradient} rounded-full flex items-center justify-center text-white font-medium`}>
              {session?.user?.name?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{session?.user?.name || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full mb-2" 
            onClick={onBackToHome}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Home
          </Button>
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBackToHome}>
              <Home className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-500" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
      <aside className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-gradient-to-br ${currentTheme.gradient} rounded-xl`}>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeTab === item.id 
                  ? `bg-gradient-to-r ${currentTheme.gradient} text-white font-medium` 
                  : "text-muted-foreground hover:bg-slate-100"
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
  const [theme, setTheme] = useState<ThemeColor>("emerald")
  const [isDark, setIsDark] = useState(true)
  const [view, setView] = useState<"guest" | "admin-login" | "register" | "petugas-login" | "petugas" | "admin">("guest")
  const [schools, setSchools] = useState<PublicSchool[]>([])
  const [petugasData, setPetugasData] = useState<{ name: string; userId: string; schoolName: string } | null>(null)
  const [petugasSchedules, setPetugasSchedules] = useState<Schedule[]>([])
  const [petugasAudios, setPetugasAudios] = useState<Audio[]>([])

  // Seed database on first load
  useEffect(() => {
    fetch("/api/seed").catch(console.error)
  }, [])

  // Set view to admin when authenticated
  useEffect(() => {
    if (status === "authenticated" && view === "guest") {
      // Use setTimeout to avoid cascading renders
      setTimeout(() => setView("admin"), 0)
    }
  }, [status])

  // Fetch schools for guest page
  const fetchSchools = useCallback(async () => {
    try {
      const res = await fetch("/api/schools")
      if (res.ok) {
        const data = await res.json()
        setSchools(data)
      }
    } catch (error) {
      console.error("Error fetching schools:", error)
    }
  }, [])

  useEffect(() => {
    // Use setTimeout to defer fetch and avoid cascading renders
    const timeout = setTimeout(() => {
      fetchSchools()
    }, 0)
    return () => clearTimeout(timeout)
  }, [fetchSchools])

  // Fetch petugas data
  const fetchPetugasData = useCallback(async (userId: string) => {
    try {
      const schedulesRes = await fetch(`/api/schedules?userId=${userId}`)
      const audiosRes = await fetch(`/api/audios?userId=${userId}`)
      
      setTimeout(() => {
        if (schedulesRes.ok) {
          schedulesRes.json().then(setPetugasSchedules)
        }
        if (audiosRes.ok) {
          audiosRes.json().then(setPetugasAudios)
        }
      }, 0)
    } catch (error) {
      console.error("Error fetching petugas data:", error)
    }
  }, [])

  useEffect(() => {
    if (petugasData?.userId) {
      fetchPetugasData(petugasData.userId)
    }
  }, [petugasData?.userId])

  const handleBackToHome = () => {
    setView("guest")
  }

  if (status === "loading") {
    return (
      <ThemeContext.Provider value={{ theme, setTheme, isDark, setIsDark }}>
        <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${themeColors[theme].primary}-500`} />
        </div>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, setIsDark }}>
      {/* Guest Page */}
      {view === "guest" && (
        <GuestPage 
          onAdminLogin={() => setView("admin-login")}
          onPetugasLogin={() => setView("petugas-login")}
          onRegister={() => setView("register")}
          schools={schools}
          isAuthenticated={status === "authenticated"}
          onGoToDashboard={() => setView("admin")}
        />
      )}

      {/* Admin Login */}
      {view === "admin-login" && status !== "authenticated" && (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-slate-50 via-white to-slate-100"} p-4`}>
          <LoginForm onClose={() => setView("guest")} onSwitchRegister={() => setView("register")} />
        </div>
      )}

      {/* Register */}
      {view === "register" && status !== "authenticated" && (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-slate-50 via-white to-slate-100"} p-4`}>
          <RegisterForm onClose={() => setView("guest")} onSwitchLogin={() => setView("admin-login")} />
        </div>
      )}

      {/* Petugas Login */}
      {view === "petugas-login" && (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-slate-50 via-white to-slate-100"} p-4`}>
          <PetugasLoginForm onSuccess={(data) => { setPetugasData(data); setView("petugas") }} />
        </div>
      )}

      {/* Petugas Dashboard */}
      {view === "petugas" && petugasData && (
        <PetugasDashboard
          schedules={petugasSchedules}
          audios={petugasAudios}
          petugasData={petugasData}
          onLogout={() => { setPetugasData(null); setView("guest") }}
          onRefresh={() => fetchPetugasData(petugasData.userId)}
        />
      )}

      {/* Admin Dashboard (authenticated and view is admin) */}
      {status === "authenticated" && view === "admin" && (
        <AdminDashboard 
          onUpdate={() => {}} 
          onBackToHome={handleBackToHome}
        />
      )}
    </ThemeContext.Provider>
  )
}
