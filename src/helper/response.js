exports.sendHttpResponse = async (req, res, next, ApiResponse) => {
    if (ApiResponse && ApiResponse.status && ['success', 'error'].includes(ApiResponse.status)) {
        if (ApiResponse.status === 'success') {
            return res
                .status(ApiResponse.statusCode || 200)
                .json(ApiResponse)
                .end();
        } else {
            return res.status(ApiResponse.statusCode || 200).json(ApiResponse).end();
        }
    }
    res.json(ApiResponse).end();
};

exports.generateResponse = ({statusCode, status, data, msg}) => {
    if (status && ['success', 'error'].includes(status)) {
        if (status === 'success') {
            return {
                statusCode: statusCode || 200,
                status: status,
                msg: msg || undefined,
                data: data || undefined
            }
        } else {
            return {
                statusCode: statusCode || 500,
                status: status,
                msg: msg || undefined
            }
        }
    }
    return {
        statusCode: 500,
        status: 'error',
        msg: 'Internal Server Error'
    }
}