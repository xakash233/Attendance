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
        if (req.body && typeof req.body === 'object') {
            const cleaned = clean(req.body);
            Object.assign(req.body, cleaned);
        }
        if (req.query && typeof req.query === 'object') {
            const cleaned = clean(req.query);
            Object.assign(req.query, cleaned);
        }
        if (req.params && typeof req.params === 'object') {
            const cleaned = clean(req.params);
            Object.assign(req.params, cleaned);
        }
        next();
    };
};

export default xssSanitizer;
