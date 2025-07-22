// scoreboard.js - Mobile-friendly scoreboard functionality

class MobileScoreboard {
    constructor() {
        this.registeredTeams = JSON.parse(localStorage.getItem('registeredTeams')) || [];
        this.teamScores = JSON.parse(localStorage.getItem('teamScores')) || {};
        this.currentTeam = null;
        this.init();
    }

    init() {
        this.updateStats();
        this.loadLeaderboard();
        this.setupEventListeners();
        this.updateLastUpdated();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadLeaderboard();
            this.updateStats();
            this.updateLastUpdated();
        }, 30000);
    }

    setupEventListeners() {
        // Team authentication
        document.getElementById('team-auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.authenticateTeam();
        });

        // Score submission
        document.getElementById('score-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitScore();
        });

        // Hole selection change
        document.getElementById('hole-select').addEventListener('change', () => {
            this.updateScorePreview();
        });
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
            this.showMessage('auth-message', 'Authentication successful!', 'success');
        } else {
            this.showMessage('auth-message', 'Team name and captain email do not match our records.', 'error');
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
    }

    loadTeamScorecard() {
        if (!this.currentTeam) return;

        // Initialize team scores if they don't exist
        if (!this.teamScores[this.currentTeam.id]) {
            this.teamScores[this.currentTeam.id] = {
                teamName: this.currentTeam.name,
                captain: this.currentTeam.captain,
                scores: new Array(18).fill(null),
                totalScore: 0,
                holesCompleted: 0
            };
        }

        this.updateScorePreview();
    }

    updateScorePreview() {
        if (!this.currentTeam) return;

        const teamScore = this.teamScores[this.currentTeam.id];
        const scorecardDiv = document.getElementById('team-scorecard');
        
        let html = '<div class="scorecard-grid">';
        
        for (let i = 0; i < 18; i++) {
            const holeNum = i + 1;
            const score = teamScore.scores[i];
            const isCurrentHole = document.getElementById('hole-select').value == holeNum;
            
            html += `
                <div class="hole-score ${isCurrentHole ? 'current' : ''} ${score ? 'completed' : ''}">
                    <div class="hole-num">${holeNum}</div>
                    <div class="hole-score-val">${score || '-'}</div>
                </div>
            `;
        }
        
        html += '</div>';
        html += `<div class="total-score">Total: ${teamScore.totalScore} (${teamScore.holesCompleted}/18 holes)</div>`;
        
        scorecardDiv.innerHTML = html;
    }

    submitScore() {
        if (!this.currentTeam) return;

        const holeNumber = parseInt(document.getElementById('hole-select').value);
        const score = parseInt(document.getElementById('team-score').value);

        if (!holeNumber || !score) {
            this.showMessage('submission-message', 'Please select a hole and enter a score.', 'error');
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

        // Save to localStorage
        localStorage.setItem('teamScores', JSON.stringify(this.teamScores));

        // Update displays
        this.updateScorePreview();
        this.loadLeaderboard();
        this.updateStats();

        // Reset form
        document.getElementById('score-form').reset();
        
        this.showMessage('submission-message', `Score submitted successfully! Hole ${holeNumber}: ${score} strokes`, 'success');
    }

    loadLeaderboard() {
        const leaderboardBody = document.getElementById('leaderboard-body');
        
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
            leaderboardBody.innerHTML = '<div class="no-scores">No scores submitted yet</div>';
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
    }

    getRankDisplay(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return rank;
    }

    getToParDisplay(team) {
        const par = 72;
        const expectedScore = (par * team.holesCompleted) / 18;
        const toPar = team.totalScore - expectedScore;
        
        if (toPar === 0) return 'E';
        return toPar > 0 ? `+${Math.round(toPar)}` : Math.round(toPar);
    }

    updateStats() {
        const totalTeams = Object.keys(this.teamScores).length;
        const scoresSubmitted = Object.values(this.teamScores)
            .reduce((sum, team) => sum + team.holesCompleted, 0);
