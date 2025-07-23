// scoreboard.js - Enhanced mobile-friendly scoreboard functionality
class MobileScoreboard {
    constructor() {
        this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
        this.teamScores = JSON.parse(localStorage.getItem('teamScores')) || {};
        this.currentTeam = null;
        this.init();
    }
    
    init() {
        this.syncTeamData();
        this.updateStats();
        this.loadLeaderboard();
        this.setupEventListeners();
        this.updateLastUpdated();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refreshData();
        }, 30000);
    }
    
    syncTeamData() {
        // Sync registered teams with scoreboard
        this.registeredTeams.forEach(team => {
            if (!this.teamScores[team.id]) {
                this.teamScores[team.id] = {
                    teamId: team.id,
                    teamName: team.name,
                    captain: team.captain,
                    captainEmail: team.captainEmail,
                    scores: new Array(18).fill(null),
                    totalScore: 0,
                    holesCompleted: 0,
                    lastUpdated: new Date().toISOString()
                };
            }
        });
        this.saveTeamScores();
    }
    
    setupEventListeners() {
        // Team authentication
        const authForm = document.getElementById('team-auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.authenticateTeam();
            });
        }
        
        // Score submission
        const scoreForm = document.getElementById('score-form');
        if (scoreForm) {
            scoreForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitScore();
            });
        }
        
        // Hole selection change
        const holeSelect = document.getElementById('hole-select');
        if (holeSelect) {
            holeSelect.addEventListener('change', () => {
                this.updateScorePreview();
            });
        }
        
        // Listen for new team registrations
        window.addEventListener('teamComplete', (event) => {
            this.handleNewTeam(event.detail.team);
        });
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'registeredTeams') {
                this.registeredTeams = JSON.parse(e.newValue || '[]');
                this.syncTeamData();
                this.updateStats();
                this.loadLeaderboard();
            }
        });
    }
    
    handleNewTeam(team) {
        // Add new team to scoreboard when they complete registration
        if (!this.teamScores[team.id]) {
            this.teamScores[team.id] = {
                teamId: team.id,
                teamName: team.name,
                captain: team.captain,
                captainEmail: team.captainEmail,
                scores: new Array(18).fill(null),
                totalScore: 0,
                holesCompleted: 0,
                lastUpdated: new Date().toISOString()
            };
            this.saveTeamScores();
            this.updateStats();
            this.loadLeaderboard();
        }
    }
    
    authenticateTeam() {
        const teamName = document.getElementById('auth-team-name').value.trim();
        const captainEmail = document.getElementById('auth-captain-email').value.trim();
        
        // Find team in registered teams
        const team = this.registeredTeams.find(t =>
            t.name.toLowerCase() === teamName.toLowerCase() &&
            t.captainEmail.toLowerCase() === captainEmail.toLowerCase()
        );
        
        if (team) {
            this.currentTeam = team;
            this.showScoreSubmission();
            this.loadTeamScorecard();
            this.showMessage('auth-message', '✅ Authentication successful!', 'success');
        } else {
            this.showMessage('auth-message', '❌ Team name and captain email do not match our records.', 'error');
        }
    }
    
    showScoreSubmission() {
        document.getElementById('team-login').style.display = 'none';
        document.getElementById('score-submission').style.display = 'block';
        document.getElementById('logged-team-name').textContent = this.currentTeam.name;
    }
    
    logoutTeam() {
        this.currentTeam = null;
        document.getElementById('team-login').style.display = 'block';
        document.getElementById('score-submission').style.display = 'none';
        document.getElementById('team-auth-form').reset();
        document.getElementById('score-form').reset();
        document.getElementById('auth-message').textContent = '';
        document.getElementById('submission-message').textContent = '';
    }
    
    loadTeamScorecard() {
        if (!this.currentTeam) return;
        
        // Initialize team scores if they don't exist
        if (!this.teamScores[this.currentTeam.id]) {
            this.teamScores[this.currentTeam.id] = {
                teamId: this.currentTeam.id,
                teamName: this.currentTeam.name,
                captain: this.currentTeam.captain,
                captainEmail: this.currentTeam.captainEmail,
                scores: new Array(18).fill(null),
                totalScore: 0,
                holesCompleted: 0,
                lastUpdated: new Date().toISOString()
            };
            this.saveTeamScores();
        }
        
        this.updateScorePreview();
    }
    
    updateScorePreview() {
        if (!this.currentTeam) return;
        
        const teamScore = this.teamScores[this.currentTeam.id];
        const scorecardDiv = document.getElementById('team-scorecard');
        const selectedHole = document.getElementById('hole-select').value;
        
        let html = '<div class="scorecard-grid">';
        
        // Create mini scorecard
        for (let i = 0; i < 18; i++) {
            const holeNum = i + 1;
            const score = teamScore.scores[i];
            const isCurrentHole = selectedHole == holeNum;
            const par = this.getHolePar(holeNum);
            
            html += `
                <div class="hole-score ${isCurrentHole ? 'current' : ''} ${score ? 'completed' : ''}">
                    <div class="hole-num">H${holeNum}</div>
                    <div class="hole-par">P${par}</div>
                    <div class="hole-score-val">${score || '-'}</div>
                </div>
            `;
        }
        
        html += '</div>';
        html += `
            <div class="scorecard-summary">
                <div class="total-score">Total: ${teamScore.totalScore}</div>
                <div class="holes-completed">${teamScore.holesCompleted}/18 holes</div>
                <div class="to-par">${this.getToParDisplay(teamScore)}</div>
            </div>
        `;
        
        scorecardDiv.innerHTML = html;
    }
    
    getHolePar(holeNumber) {
        // Standard par layout
        const pars = [4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5,4];
        return pars[holeNumber - 1] || 4;
    }
    
    submitScore() {
        if (!this.currentTeam) return;
        
        const holeNumber = parseInt(document.getElementById('hole-select').value);
        const score = parseInt(document.getElementById('team-score').value);
        
        if (!holeNumber || !score || score < 1 || score > 15) {
            this.showMessage('submission-message', '❌ Please select a hole and enter a valid score (1-15).', 'error');
            return;
        }
        
        const teamScore = this.teamScores[this.currentTeam.id];
        
        // Check if score already exists
        if (teamScore.scores[holeNumber - 1] !== null) {
            if (!confirm(`You already have a score of ${teamScore.scores[holeNumber - 1]} for hole ${holeNumber}. Do you want to update it?`)) {
                return;
            }
        }
        
        // Update score
        const oldScore = teamScore.scores[holeNumber - 1] || 0;
        teamScore.scores[holeNumber - 1] = score;
        teamScore.totalScore = teamScore.totalScore - oldScore + score;
        teamScore.holesCompleted = teamScore.scores.filter(s => s !== null).length;
        teamScore.lastUpdated = new Date().toISOString();
        
        // Save to localStorage
        this.saveTeamScores();
        
        // Update displays
        this.updateScorePreview();
        this.loadLeaderboard();
        this.updateStats();
        
        // Reset form
        document.getElementById('score-form').reset();
        
        const par = this.getHolePar(holeNumber);
        const scoreToPar = score - par;
        const scoreText = scoreToPar === 0 ? 'Par' : scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar;
        
        this.showMessage('submission-message', `✅ Score submitted! Hole ${holeNumber}: ${score} strokes (${scoreText})`, 'success');
    }
    
    loadLeaderboard() {
        const leaderboardBody = document.getElementById('leaderboard-body');
        if (!leaderboardBody) return;
        
        // Convert teamScores to array and sort
        const teams = Object.values(this.teamScores)
            .filter(team => team.holesCompleted > 0)
            .sort((a, b) => {
                // Sort by total score, then by holes completed
                if (a.totalScore === b.totalScore) {
                    return b.holesCompleted - a.holesCompleted;
                }
                return a.totalScore - b.totalScore;
            });
        
        if (teams.length === 0) {
            leaderboardBody.innerHTML = `
                <div class="no-scores">
                    <h3>🏌️ No scores submitted yet</h3>
                    <p>Teams will appear here once they start submitting scores.</p>
                </div>
            `;
            return;
        }
        
        leaderboardBody.innerHTML = teams.map((team, index) => `
            <div class="leaderboard-row ${index === 0 ? 'leader' : ''}">
                <div class="rank-col">${this.getRankDisplay(index + 1)}</div>
                <div class="team-col">
                    <div class="team-name">${team.teamName}</div>
                    <div class="team-captain">${team.captain}</div>
                </div>
                <div class="score-col">
                    <div class="total-score">${team.totalScore}</div>
                    <div class="to-par">${this.getToParDisplay(team)}</div>
                </div>
                <div class="holes-col">${team.holesCompleted}/18</div>
            </div>
        `).join('');
        
        // Update current leader
        const leaderElement = document.getElementById('current-leader');
        if (leaderElement && teams.length > 0) {
            leaderElement.textContent = teams[0].teamName;
        }
    }
    
    getRankDisplay(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return rank;
    }
    
    getToParDisplay(team) {
        const totalPar = 72;
        const expectedPar = (totalPar * team.holesCompleted) / 18;
        const toPar = team.totalScore - expectedPar;
        
        if (Math.abs(toPar) < 0.1) return 'E';
        return toPar > 0 ? `+${Math.round(toPar)}` : Math.round(toPar);
    }
    
    updateStats() {
        const totalTeamsElement = document.getElementById('total-teams');
        const scoresSubmittedElement = document.getElementById('scores-submitted');
        
        const totalTeams = Object.keys(this.teamScores).length;
        const scoresSubmitted = Object.values(this.teamScores)
            .reduce((sum, team) => sum + team.holesCompleted, 0);
        
        if (totalTeamsElement) totalTeamsElement.textContent = totalTeams;
        if (scoresSubmittedElement) scoresSubmittedElement.textContent = scoresSubmitted;
    }
    
    updateLastUpdated() {
        const lastUpdateElement = document.getElementById('last-update-time');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }
    
    refreshData() {
        this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
        this.syncTeamData();
        this.loadLeaderboard();
        this.updateStats();
        this.updateLastUpdated();
    }
    
    showMessage(elementId, message, type) {
        const messageElement = document.getElementById(elementId);
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `message ${type === 'error' ? 'error-message' : 'success-message'}`;
            
            // Clear message after 5 seconds
            setTimeout(() => {
                messageElement.textContent = '';
                messageElement.className = 'message';
            }, 5000);
        }
    }
    
    saveTeamScores() {
        localStorage.setItem('teamScores', JSON.stringify(this.teamScores));
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.mobileScoreboard = new MobileScoreboard();
});

// Export for global access
window.MobileScoreboard = MobileScoreboard;
