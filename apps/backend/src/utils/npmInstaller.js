const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Utilitaire pour installer automatiquement les dépendances npm d'un jeu
 */
class NpmInstaller {
    /**
     * Installer les dépendances npm dans un dossier de jeu
     * @param {string} gameFolderPath - Chemin vers le dossier du jeu
     * @returns {Promise<Object>} - Résultat de l'installation
     */
    static async installDependencies(gameFolderPath) {
        return new Promise((resolve, reject) => {
            // Vérifier que le dossier existe
            if (!fs.existsSync(gameFolderPath)) {
                return reject(new Error(`Le dossier du jeu n'existe pas: ${gameFolderPath}`));
            }

            // Vérifier que package.json existe
            const packageJsonPath = path.join(gameFolderPath, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                // Pas de package.json, donc pas besoin d'installer les dépendances
                console.log(`[NpmInstaller] Pas de package.json trouvé dans ${gameFolderPath}, aucune dépendance à installer`);
                return resolve({
                    success: true,
                    message: 'Aucune dépendance à installer (pas de package.json)',
                    skipped: true
                });
            }

            // Vérifier si node_modules existe déjà
            const nodeModulesPath = path.join(gameFolderPath, 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                console.log(`[NpmInstaller] node_modules existe déjà dans ${gameFolderPath}, installation ignorée`);
                return resolve({
                    success: true,
                    message: 'Dépendances déjà installées',
                    skipped: true
                });
            }

            console.log(`[NpmInstaller] Installation des dépendances npm dans ${gameFolderPath}...`);

            // Déterminer la commande npm selon l'OS
            const isWindows = process.platform === 'win32';
            const npmCmd = isWindows ? 'npm.cmd' : 'npm';

            // Lancer npm install
            const npmProcess = spawn(npmCmd, ['install'], {
                cwd: gameFolderPath,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: false
            });

            let stdout = '';
            let stderr = '';

            npmProcess.stdout.on('data', (data) => {
                stdout += data.toString();
                // Afficher la progression en temps réel
                process.stdout.write(data);
            });

            npmProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                // Afficher les warnings/erreurs en temps réel
                process.stderr.write(data);
            });

            npmProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`[NpmInstaller] ✅ Dépendances installées avec succès dans ${gameFolderPath}`);
                    resolve({
                        success: true,
                        message: 'Dépendances installées avec succès',
                        stdout: stdout,
                        stderr: stderr
                    });
                } else {
                    const error = new Error(`Échec de l'installation des dépendances (code: ${code})`);
                    error.code = code;
                    error.stdout = stdout;
                    error.stderr = stderr;
                    console.error(`[NpmInstaller] ❌ Erreur lors de l'installation des dépendances:`, error.message);
                    reject(error);
                }
            });

            npmProcess.on('error', (error) => {
                console.error(`[NpmInstaller] ❌ Erreur lors du lancement de npm install:`, error.message);
                reject(new Error(`Impossible de lancer npm install: ${error.message}`));
            });
        });
    }

    /**
     * Vérifier si les dépendances sont installées
     * @param {string} gameFolderPath - Chemin vers le dossier du jeu
     * @returns {boolean} - true si node_modules existe
     */
    static areDependenciesInstalled(gameFolderPath) {
        const nodeModulesPath = path.join(gameFolderPath, 'node_modules');
        return fs.existsSync(nodeModulesPath);
    }

    /**
     * Vérifier si le jeu nécessite une installation npm (a un package.json)
     * @param {string} gameFolderPath - Chemin vers le dossier du jeu
     * @returns {boolean} - true si package.json existe
     */
    static needsNpmInstall(gameFolderPath) {
        const packageJsonPath = path.join(gameFolderPath, 'package.json');
        return fs.existsSync(packageJsonPath);
    }
}

module.exports = NpmInstaller;
