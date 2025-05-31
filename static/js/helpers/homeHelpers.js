// homeHelpers.js
// Shared helper functions for home view logic

export function constrainResizeDimensions(dimensions, posterRect) {
    const padding = getHomePosterPadding();
    let result = { ...dimensions };
    result.width = Math.max(200, result.width);
    result.height = Math.max(150, result.height);
    result.width = Math.min(500, result.width);
    result.height = Math.min(400, result.height);
    if (result.x < padding.left) {
        const overflow = padding.left - result.x;
        result.x = padding.left;
        if (result.adjustWidthFromLeft) {
            result.width = Math.max(200, result.width - overflow);
        }
    }
    if (result.y < padding.top) {
        const overflow = padding.top - result.y;
        result.y = padding.top;
        if (result.adjustHeightFromTop) {
            result.height = Math.max(150, result.height - overflow);
        }
    }
    const rightEdge = posterRect.width - padding.right;
    if (result.x + result.width > rightEdge) {
        const overflow = (result.x + result.width) - rightEdge;
        if (!result.adjustWidthFromLeft) {
            result.width = Math.max(200, result.width - overflow);
        } else {
            result.width = Math.max(200, result.width);
            result.x = Math.min(result.x, rightEdge - result.width);
        }
    }
    const bottomEdge = posterRect.height - padding.bottom;
    if (result.y + result.height > bottomEdge) {
        const overflow = (result.y + result.height) - bottomEdge;
        if (!result.adjustHeightFromTop) {
            result.height = Math.max(150, result.height - overflow);
        } else {
            result.height = Math.max(150, result.height);
            result.y = Math.min(result.y, bottomEdge - result.height);
        }
    }
    return result;
}

export function getHomePosterPadding() {
    return {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    };
} 