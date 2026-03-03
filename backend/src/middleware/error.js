const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    let error = { ...err };
    error.message = err.message;

    // Prisma unique constraint error
    if (err.code === 'P2002') {
        const field = err.meta.target.join(', ');
        error.message = `Duplicate field value entered: ${field}`;
        return res.status(400).json({ success: false, error: error.message });
    }

    res.status(err.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler;
