import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), // 🔥 important
  limits: { fileSize: 5 * 1024 * 1024 },
});