const uploadController = {
    uploadImage: (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Tidak ada file yang diupload atau format file tidak sesuai"
                });
            }

            // Return path for database storage and client access
            const filePath = `/uploads/${req.file.filename}`;

            return res.status(200).json({
                success: true,
                message: "Gambar berhasil diupload",
                data: {
                    url: filePath,
                    filename: req.file.filename,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

export default uploadController;
