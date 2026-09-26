export function cleanText(value: string, maxLength = 500) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength)
}

export function safeDownloadName(value: string) {
  const name = value.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-").trim()
  return (name || "media").slice(0, 180)
}
