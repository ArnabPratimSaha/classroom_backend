
const { MulterError } = require('multer');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const MIMETYPE = new Map([
    ['image/jpg', 'jpg'],
    ['image/png', 'png'],
    ['image/jpeg', 'jpeg'],
    ['application/msword', '.doc'],
    ['text/plain', '.txt'],
    ['application/pdf', '.pdf'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx']
]);
const maxFileSize = 1000 * 1000 * 3;

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, `./files`)
        },
        filename: (req, file, cb) => {
            const ext = MIMETYPE.get(file.mimetype);
            cb(null, uuidv4() + '.' + ext)
        },
    }),
    limits: {
        fileSize: maxFileSize
    },
    fileFilter: (req, file, cb) => {
        let error = null;
        let isValid = true;
        if (!MIMETYPE.get(file.mimetype)) {
            error = new MulterError('LIMIT_UNEXPECTED_FILE');
            error.message = 'file format not supported'
            isValid = false;
        }
        cb(error, isValid);
    }
});

const fileHandler = (req, res, next) => {
    const multerUpload = upload.array('file', 10);
    multerUpload(req, res, (err) => {
        if (err) {
            return res.status(404).json(err.message);
        }
        // Everything went fine. 
        return next();
    })
}
module.exports = { fileHandler }