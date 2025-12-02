const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});
const createFileFilter = (type) => {
    return (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const types = {
            image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".ico"],
            pdf: [".pdf"],
            video: [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"],
            audio: [".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a"],
            excel: [".xls", ".xlsx", ".csv", ".ods"],
            word: [".doc", ".docx", ".odt", ".rtf", ".txt"],
            ppt: [".ppt", ".pptx", ".odp"],
            sql: [".sql"],
            code: [".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".scss", ".py", ".java", ".c", ".cpp", ".cs", ".php", ".rb", ".go", ".json", ".xml", ".yml", ".yaml"],
            archive: [".zip", ".rar", ".7z", ".tar", ".gz"],
            font: [".ttf", ".otf", ".woff", ".woff2"],
            design: [".psd", ".ai", ".xd", ".fig", ".sketch"],
            misc: [".log", ".ini", ".md", ".bak"],
            any: [
                // combine all
                ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".ico",
                ".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a",
                ".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm",
                ".pdf",
                ".xls", ".xlsx", ".csv", ".ods",
                ".doc", ".docx", ".odt", ".rtf", ".txt",
                ".ppt", ".pptx", ".odp",
                ".sql",
                ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".scss", ".py", ".java", ".c", ".cpp", ".cs", ".php", ".rb", ".go", ".json", ".xml", ".yml", ".yaml",
                ".zip", ".rar", ".7z", ".tar", ".gz",
                ".ttf", ".otf", ".woff", ".woff2",
                ".psd", ".ai", ".xd", ".fig", ".sketch",
                ".log", ".ini", ".md", ".bak"
            ],
        };

        if (type != "any") {

            const allowed = types[type];

            if (!allowed) return cb(new Error("Invalid upload type configuration"));
            if (!allowed.includes(ext)) {
                return cb(
                    new Error(`❌ Only ${type.toUpperCase()} files are allowed!`),
                    false
                );
            }
        }
        cb(null, true);
    };
};
const Store = (type) =>
    multer({
        storage,
        fileFilter: createFileFilter(type),
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    });
module.exports = Store;
