/**
 * Test the coordinate system functionality
 */
function testCoordinateSystem() {
    console.log('Testing coordinate system...');
    
    // Test that all required modules are available
    console.log('CoordinateUtils available:', typeof CoordinateUtils !== 'undefined');
    console.log('PreferencesClient available:', typeof PreferencesClient !== 'undefined');
    console.log('ConceptModel available:', typeof ConceptModel !== 'undefined');
    
    if (typeof CoordinateUtils === 'undefined') {
        console.error('CoordinateUtils not available!');
        return;
    }
    
    try {
        // Test with different aspect ratios
        console.log('\n=== Testing 1:2 aspect ratio (tall) ===');
        testAspectRatio(400, 800, '1:2 tall');
        
        console.log('\n=== Testing 2:1 aspect ratio (wide) ===');
        testAspectRatio(800, 400, '2:1 wide');
        
        console.log('\n=== Testing 1:1 aspect ratio (square) ===');
        testAspectRatio(600, 600, '1:1 square');
        
        console.log('✅ Coordinate system tests completed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Coordinate system test failed:', error);
        return false;
    }
}

function testAspectRatio(containerWidth, containerHeight, description) {
    console.log(`Testing ${description} (${containerWidth}x${containerHeight})`);
    
    // Test center tile (should be in middle of container)
    const centerCoords = { centerX: 0, centerY: 0, width: 20, height: 15 };
    
    const pixelCoords = CoordinateUtils.percentageToPixels(
        centerCoords.centerX, centerCoords.centerY,
        centerCoords.width, centerCoords.height,
        containerWidth, containerHeight
    );
    
    // Back to percentage
    const backToPercentage = CoordinateUtils.pixelsToPercentage(
        pixelCoords.x, pixelCoords.y,
        pixelCoords.width, pixelCoords.height,
        containerWidth, containerHeight
    );
    
    console.log('Center tile:');
    console.log('  Original:', centerCoords);
    console.log('  Pixels:', pixelCoords);
    console.log('  Back to %:', backToPercentage);
    
    // Verify center position is actually in the center
    const expectedCenterPixelX = containerWidth / 2;
    const expectedCenterPixelY = containerHeight / 2;
    const actualCenterPixelX = pixelCoords.x + pixelCoords.width / 2;
    const actualCenterPixelY = pixelCoords.y + pixelCoords.height / 2;
    
    console.log(`  Expected center: ${expectedCenterPixelX}, ${expectedCenterPixelY}`);
    console.log(`  Actual center: ${actualCenterPixelX}, ${actualCenterPixelY}`);
    
    // Test coordinate limits with tile size
    const aspectRatioWidth = containerWidth / Math.min(containerWidth, containerHeight);
    const aspectRatioHeight = containerHeight / Math.min(containerWidth, containerHeight);
    const limits = CoordinateUtils.getCoordinateLimits(aspectRatioWidth, aspectRatioHeight, centerCoords.width, centerCoords.height);
    console.log('  Coordinate limits (accounting for 20x15% tile):', limits);
    
    // Test boundary positions
    console.log('  Testing boundary constraints:');
    
    // Test extreme positions and see how they get constrained
    const testPositions = [
        { centerX: -50, centerY: -50, label: 'top-left corner' },
        { centerX: 50, centerY: 50, label: 'bottom-right corner' },
        { centerX: 0, centerY: -50, label: 'top center' },
        { centerX: 0, centerY: 50, label: 'bottom center' },
        { centerX: -50, centerY: 0, label: 'left center' },
        { centerX: 50, centerY: 0, label: 'right center' }
    ];
    
    testPositions.forEach(pos => {
        const constrained = CoordinateUtils.constrainCoordinates(
            pos.centerX, pos.centerY, centerCoords.width, centerCoords.height, limits
        );
        console.log(`    ${pos.label}: ${pos.centerX},${pos.centerY} → ${constrained.centerX.toFixed(1)},${constrained.centerY.toFixed(1)}`);
    });
}

// Test module availability
function testModuleAvailability() {
    console.log('Testing module availability...');
    
    const modules = {
        'CoordinateUtils': typeof CoordinateUtils !== 'undefined',
        'PreferencesClient': typeof PreferencesClient !== 'undefined', 
        'ConceptModel': typeof ConceptModel !== 'undefined',
        'StorageManager': typeof StorageManager !== 'undefined',
        'AuthClient': typeof AuthClient !== 'undefined'
    };
    
    console.table(modules);
    
    const allAvailable = Object.values(modules).every(available => available);
    console.log(allAvailable ? '✅ All modules available' : '❌ Some modules missing');
    
    return allAvailable;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.testCoordinateSystem = testCoordinateSystem;
    window.testModuleAvailability = testModuleAvailability;
}
