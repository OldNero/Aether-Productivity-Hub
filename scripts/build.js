const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Aether Hub Cross-Platform Build Script
 */
function build() {
    console.log('🚀 Starting high-fidelity build sequence...');

    try {
        // 1. Generate Config
        console.log('--- Generating configuration...');
        execSync('node scripts/generate-config.js', { stdio: 'inherit' });

        // 2. Compile CSS
        console.log('--- Compiling state-of-the-art styles...');
        execSync('npx tailwindcss -i ./css/input.css -o ./css/output.css --minify', { stdio: 'inherit' });

        // 3. Prepare Dist Directory
        const distPath = path.join(__dirname, '..', 'dist');
        if (fs.existsSync(distPath)) {
            console.log('--- Cleaning previous build...');
            fs.rmSync(distPath, { recursive: true, force: true });
        }
        fs.mkdirSync(distPath, { recursive: true });

        // 4. Copy Assets
        const assets = ['index.html', 'js', 'css', 'views', 'favicon.svg'];
        assets.forEach(asset => {
            const src = path.join(__dirname, '..', asset);
            const dest = path.join(distPath, asset);
            
            if (fs.existsSync(src)) {
                console.log(`--- Synchronizing: ${asset}`);
                fs.cpSync(src, dest, { recursive: true });
            }
        });

        console.log('✅ Build complete! Local sanctuary is now pixel-perfect with production.');
    } catch (err) {
        console.error('❌ Build failed:', err);
        process.exit(1);
    }
}

build();
