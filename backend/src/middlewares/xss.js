import xss from 'xss';

/**
 * Middleware to sanitize deeply nested objects
 */
const clean = (data) => {
    let isObject = false;
    if (typeof data === 'object' && data !== null) {
        isObject = true;
    }

    if (!isObject) {
        if (typeof data === 'string') {
            return xss(data);
        }
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => clean(item));
    }

    const cleanedObj = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            cleanedObj[key] = clean(data[key]);
        }
    }
    return cleanedObj;
};

const xssSanitizer = () => {
    return (req, res, next) => {
        if (req.body) req.body = clean(req.body);
        if (req.query) req.query = clean(req.query);
        if (req.params) req.params = clean(req.params);
        next();
    };
};

export default xssSanitizer;
