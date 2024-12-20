<?php

require_once 'ConnectMySQLDB.php';

// Database configuration
define('DB_HOST', '37.187.28.103');
define('DB_NAME', 'ayoba-yamo-quizz');
define('DB_USER', 'ayquizzuser');
define('DB_PASS', '5qq4j8Q~7');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header("Content-Type: application/json");

// Helper function to create a new database connection for each request
function getDatabaseConnection() {
    try {
        return new ConnectMySQLDB(DB_HOST, DB_NAME, DB_USER, DB_PASS);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
        exit;
    }
}

// Helper function to send a JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Define supported endpoints
$endpoint = $_GET['endpoint'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

// Routes based on the endpoint
switch ($endpoint) {
    case 'questions':
        if ($method === 'GET') {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                // Fetch questions in random order using custom query
                $questions = $db->executeCustomQuery("SELECT * FROM questions ORDER BY RAND()");
                $db->commit();
                sendResponse($questions);
            } catch (Exception $e) {
                $db->rollback();
                $db->logError("Failed to fetch questions: " . $e->getMessage());
                sendResponse(["error" => "Failed to fetch questions"], 500);
            }
        } elseif ($method === 'POST') {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                // Add a new question
                $input = json_decode(file_get_contents("php://input"), true);

                if (!isset($input['category_id'], $input['level_id'], $input['question_text'])) {
                    throw new Exception("Invalid input");
                }

                $result = $db->create('questions', [
                    'category_id' => $input['category_id'],
                    'level_id' => $input['level_id'],
                    'question_text' => $input['question_text']
                ]);

                if (!$result) {
                    throw new Exception("Failed to add question");
                }

                $db->commit();
                sendResponse(["message" => "Question added successfully"]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => $e->getMessage()], 500);
            }
        } else {
            sendResponse(["error" => "Method not allowed"], 405);
        }
        break;

    case 'categories':
        if ($method === 'GET') {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                // Fetch all categories
                $categories = $db->read('categories');
                $db->commit();
                sendResponse($categories);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => "Failed to fetch categories: " . $e->getMessage()], 500);
            }
        } else {
            sendResponse(["error" => "Method not allowed"], 405);
        }
        break;

    case 'answers':
        if ($method === 'GET') {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                // Fetch all answers for a specific question
                $questionId = $_GET['question_id'] ?? null;

                if (!$questionId) {
                    throw new Exception("question_id is required");
                }

                $answers = $db->read('answers', ['question_id' => $questionId]);
                $db->commit();
                sendResponse($answers);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => $e->getMessage()], 400);
            }
        } else {
            sendResponse(["error" => "Method not allowed"], 405);
        }
        break;

    case 'users':
        if ($method === 'GET') {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                // Fetch all users
                $users = $db->read('users', [], '', null, null);
                $db->commit();
                sendResponse($users);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => "Failed to fetch users: " . $e->getMessage()], 500);
            }
        } elseif ($method === 'POST') {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                // Add a new user
                $input = json_decode(file_get_contents("php://input"), true);

                if (!isset($input['username'], $input['email'], $input['password'])) {
                    throw new Exception("Invalid input");
                }

                $passwordHash = password_hash($input['password'], PASSWORD_BCRYPT);

                $result = $db->create('users', [
                    'username' => $input['username'],
                    'email' => $input['email'],
                    'password_hash' => $passwordHash
                ]);

                if (!$result) {
                    throw new Exception("Failed to add user");
                }

                // Initialize statistics for the new user
                $statsInitQuery = "INSERT INTO statistics (user_id, total_quizzes_played, total_correct_answers, total_points_earned) VALUES (:user_id, 0, 0, 0)";
                $db->executeCustomQuery($statsInitQuery, [':user_id' => $db->lastInsertId()]);

                $db->commit();
                sendResponse(["message" => "User added successfully"]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => $e->getMessage()], 500);
            }
        } else {
            sendResponse(["error" => "Method not allowed"], 405);
        }
        break;

    case 'submit_answer':
       

        if ($method === 'POST') { 
            
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                // Record the user's answer for a specific question
                $input = json_decode(file_get_contents("php://input"), true);

                if (!isset($input['user_id'], $input['question_id'], $input['answer_id'])) {
                    throw new Exception("Invalid input");
                }
              
                $userId = $input['user_id'];
                $questionId = $input['question_id'];
                $answerId = $input['answer_id'];

                // Check if the answer is correct
                $checkQuery = "SELECT is_correct, level_id FROM answers a JOIN questions q ON a.question_id = q.question_id WHERE a.answer_id = :answer_id AND a.question_id = :question_id";
                $checkResult = $db->executeCustomQuery($checkQuery, [
                    ':answer_id' => $answerId,
                    ':question_id' => $questionId
                ]);

                if (!$checkResult || !isset($checkResult[0]['is_correct'], $checkResult[0]['level_id'])) {
                    throw new Exception("Invalid question or answer");
                }

                $isCorrect = (int)$checkResult[0]['is_correct'];

                // Fetch the points associated with the difficulty level
                $levelId = $checkResult[0]['level_id'];
                $pointsQuery = "SELECT points FROM difficulty_levels WHERE level_id = :level_id";
                $pointsResult = $db->executeCustomQuery($pointsQuery, [':level_id' => $levelId]);

                $pointsAwarded = ($isCorrect && $pointsResult && isset($pointsResult[0]['points'])) ? (int)$pointsResult[0]['points'] : 0;

                // Record the user's answer
                $recordQuery = "INSERT INTO user_answers (user_id, question_id, answer_id, is_correct, points_awarded) VALUES (:user_id, :question_id, :answer_id, :is_correct, :points_awarded)";
                $db->executeCustomQuery($recordQuery, [
                    ':user_id' => $userId,
                    ':question_id' => $questionId,
                    ':answer_id' => $answerId,
                    ':is_correct' => $isCorrect,
                    ':points_awarded' => $pointsAwarded
                ]);

                // Update statistics
                $statsUpdateQuery = "UPDATE statistics SET total_quizzes_played = total_quizzes_played + 1, total_correct_answers = total_correct_answers + :is_correct, total_points_earned = total_points_earned + :points_awarded WHERE user_id = :user_id";
                $db->executeCustomQuery($statsUpdateQuery, [
                    ':is_correct' => $isCorrect,
                    ':points_awarded' => $pointsAwarded,
                    ':user_id' => $userId
                ]);

                $db->commit();
                sendResponse(["message" => "Answer recorded successfully", "user_id" => $userId, "question_id" => $questionId, "is_correct" => $isCorrect, "points_awarded" => $pointsAwarded]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => $e->getMessage()], 500);
            }
        } else {
            sendResponse(["error" => "Method not allowed"], 405);
        }
        break;

    case 'get_all_tickets':
        if ($method === 'GET') {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            try {
                $tickets = $db->read('tickets');
                $db->commit();
                sendResponse($tickets);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => "Failed to fetch tickets: " . $e->getMessage()], 500);
            }
        }
        break;

    case 'leaderboard':
        try {
            $db = getDatabaseConnection();
            $db->beginTransaction();
            $query = "SELECT u.username, s.total_points_earned as points 
                     FROM users u 
                     JOIN statistics s ON u.user_id = s.user_id 
                     ORDER BY s.total_points_earned DESC 
                     LIMIT 5";
            $result = $db->executeCustomQuery($query);
            $db->commit();
            sendResponse($result);
        } catch (Exception $e) {
            $db->rollback();
            sendResponse(["error" => "Failed to fetch leaderboard: " . $e->getMessage()], 500);
        }
        break;

    case 'user_stats':
        if ($method === 'GET') {
            if (!isset($_GET['user_id'])) {
                sendResponse(["error" => "User ID is required"], 400);
            }
            
            $userId = $_GET['user_id'];
            $db = getDatabaseConnection();
            $db->beginTransaction();
            
            try {
                // Récupérer les informations de l'utilisateur
                $user = $db->read('users', ['user_id' => $userId])[0] ?? null;
                if (!$user) {
                    throw new Exception("User not found");
                }

                // Récupérer les statistiques
                $stats = $db->read('statistics', ['user_id' => $userId])[0] ?? [
                    'total_quizzes_played' => 0,
                    'total_correct_answers' => 0,
                    'total_points_earned' => 0
                ];

                // Fusionner les données
                $response = [
                    'user' => array_merge($user, $stats)
                ];

                $db->commit();
                sendResponse($response);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(["error" => "Failed to fetch user stats: " . $e->getMessage()], 500);
            }
        }
        break;

    case 'user_level':
        if ($method === 'GET') {
            if (!isset($_GET['user_id'])) {
                sendResponse(['error' => 'User ID is required'], 400);
                break;
            }
            try {
                $db = getDatabaseConnection();
                $db->beginTransaction();
                
                // Récupérer ou créer le niveau de l'utilisateur
                $query = "SELECT level, xp FROM user_levels WHERE user_id = :user_id";
                $result = $db->executeCustomQuery($query, ['user_id' => $_GET['user_id']]);
                
                if (empty($result)) {
                    // Créer une entrée par défaut
                    $query = "INSERT INTO user_levels (user_id, level, xp) VALUES (:user_id, 1, 0)";
                    $db->executeCustomQuery($query, ['user_id' => $_GET['user_id']]);
                    $result = [['level' => 1, 'xp' => 0]];
                }
                
                $db->commit();
                sendResponse(['level' => $result[0]['level'], 'xp' => $result[0]['xp']]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(['error' => 'Failed to fetch user level: ' . $e->getMessage()], 500);
            }
        } elseif ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['user_id']) || !isset($data['xp'])) {
                sendResponse(['error' => 'User ID and XP are required'], 400);
                break;
            }
            
            try {
                $db = getDatabaseConnection();
                $db->beginTransaction();
                
                // Mettre à jour l'XP et le niveau
                $query = "INSERT INTO user_levels (user_id, level, xp) 
                         VALUES (:user_id, 1, :xp)
                         ON DUPLICATE KEY UPDATE 
                         xp = xp + :xp,
                         level = FLOOR((xp + :xp) / 100) + 1";
                
                $db->executeCustomQuery($query, [
                    'user_id' => $data['user_id'],
                    'xp' => $data['xp']
                ]);
                
                // Récupérer les nouvelles valeurs
                $query = "SELECT level, xp FROM user_levels WHERE user_id = :user_id";
                $result = $db->executeCustomQuery($query, ['user_id' => $data['user_id']]);
                
                $db->commit();
                sendResponse([
                    'level' => $result[0]['level'],
                    'xp' => $result[0]['xp'],
                    'message' => 'XP updated successfully'
                ]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(['error' => 'Failed to update XP: ' . $e->getMessage()], 500);
            }
        }
        break;

    case 'achievements':
        if ($method === 'GET') {
            if (!isset($_GET['user_id'])) {
                sendResponse(['error' => 'User ID is required'], 400);
                break;
            }
            
            try {
                $db = getDatabaseConnection();
                $db->beginTransaction();
                
                // Récupérer tous les succès avec leur statut pour l'utilisateur
                $query = "SELECT 
                            a.*,
                            CASE WHEN ua.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
                            ua.unlocked_at
                         FROM achievements a
                         LEFT JOIN user_achievements ua ON a.achievement_id = ua.achievement_id 
                            AND ua.user_id = :user_id
                         ORDER BY a.achievement_id";
                
                $achievements = $db->executeCustomQuery($query, ['user_id' => $_GET['user_id']]);
                
                $db->commit();
                sendResponse(['achievements' => $achievements]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(['error' => 'Failed to fetch achievements: ' . $e->getMessage()], 500);
            }
        } elseif ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['user_id']) || !isset($data['achievement_id'])) {
                sendResponse(['error' => 'User ID and Achievement ID are required'], 400);
                break;
            }
            
            try {
                $db = getDatabaseConnection();
                $db->beginTransaction();
                
                // Vérifier si l'utilisateur a déjà débloqué ce succès
                $query = "SELECT * FROM user_achievements 
                         WHERE user_id = :user_id AND achievement_id = :achievement_id";
                $existing = $db->executeCustomQuery($query, [
                    'user_id' => $data['user_id'],
                    'achievement_id' => $data['achievement_id']
                ]);
                
                if (empty($existing)) {
                    // Débloquer le succès
                    $query = "INSERT INTO user_achievements (user_id, achievement_id)
                             VALUES (:user_id, :achievement_id)";
                    $db->executeCustomQuery($query, [
                        'user_id' => $data['user_id'],
                        'achievement_id' => $data['achievement_id']
                    ]);
                    
                    $message = 'Achievement unlocked successfully';
                } else {
                    $message = 'Achievement already unlocked';
                }
                
                $db->commit();
                sendResponse(['message' => $message]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(['error' => 'Failed to unlock achievement: ' . $e->getMessage()], 500);
            }
        }
        break;

    case 'check_achievements':
        if ($method === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['user_id'])) {
                sendResponse(['error' => 'User ID is required'], 400);
                break;
            }
            
            try {
                $db = getDatabaseConnection();
                $db->beginTransaction();
                
                // Récupérer les statistiques de l'utilisateur
                $query = "SELECT * FROM statistics WHERE user_id = :user_id";
                $stats = $db->executeCustomQuery($query, ['user_id' => $data['user_id']]);
                
                if (empty($stats)) {
                    throw new Exception('User statistics not found');
                }
                
                $stats = $stats[0];
                
                // Vérifier chaque type de succès
                $newAchievements = [];
                
                // Succès basés sur les bonnes réponses
                $query = "SELECT * FROM achievements 
                         WHERE condition_type = 'correct_answers' 
                         AND condition_value <= :correct_answers
                         AND achievement_id NOT IN (
                             SELECT achievement_id FROM user_achievements 
                             WHERE user_id = :user_id
                         )";
                $achievements = $db->executeCustomQuery($query, [
                    'correct_answers' => $stats['total_correct_answers'],
                    'user_id' => $data['user_id']
                ]);
                
                foreach ($achievements as $achievement) {
                    $newAchievements[] = $achievement;
                    $db->executeCustomQuery(
                        "INSERT INTO user_achievements (user_id, achievement_id) VALUES (:user_id, :achievement_id)",
                        ['user_id' => $data['user_id'], 'achievement_id' => $achievement['achievement_id']]
                    );
                }
                
                // Succès basés sur les points
                $query = "SELECT * FROM achievements 
                         WHERE condition_type = 'points' 
                         AND condition_value <= :points
                         AND achievement_id NOT IN (
                             SELECT achievement_id FROM user_achievements 
                             WHERE user_id = :user_id
                         )";
                $achievements = $db->executeCustomQuery($query, [
                    'points' => $stats['total_points_earned'],
                    'user_id' => $data['user_id']
                ]);
                
                foreach ($achievements as $achievement) {
                    $newAchievements[] = $achievement;
                    $db->executeCustomQuery(
                        "INSERT INTO user_achievements (user_id, achievement_id) VALUES (:user_id, :achievement_id)",
                        ['user_id' => $data['user_id'], 'achievement_id' => $achievement['achievement_id']]
                    );
                }
                
                $db->commit();
                sendResponse([
                    'message' => 'Achievements checked successfully',
                    'new_achievements' => $newAchievements
                ]);
            } catch (Exception $e) {
                $db->rollback();
                sendResponse(['error' => 'Failed to check achievements: ' . $e->getMessage()], 500);
            }
        }
        break;

    default:
        sendResponse(["error" => "Endpoint not found"], 404);
        break;
}

?>
