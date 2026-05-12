export default function RootPage() {
  // El middleware redirige según rol antes de llegar aquí.
  // Este fallback solo se ve si por alguna razón el middleware no actuó.
  return <p className="p-8 text-muted-foreground">Redirigiendo...</p>
}
