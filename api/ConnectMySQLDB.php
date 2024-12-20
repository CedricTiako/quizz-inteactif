<?php

class ConnectMySQLDB {
    private $pdo;
    private $logDirectory = __DIR__ . '/log/';  // Répertoire pour stocker les fichiers de log

    public function __construct($host, $dbname, $username, $password) {
        $this->createLogDirectory(); // Créer le dossier de log s'il n'existe pas

        try {
            $this->pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password, array(
                PDO::ATTR_PERSISTENT => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'
            ));
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            $this->logError("Erreur de connexion à la base de données : " . $e->getMessage());
            die("Erreur de connexion : Veuillez contacter l'administrateur système.");
        }
    }

    /**
     * Insère un nouvel enregistrement dans la table spécifiée.
     *
     * @param string $table Le nom de la table.
     * @param array $data Un tableau associatif des noms de colonnes et des valeurs.
     * @return bool True en cas de succès, False en cas d'échec.
     */
    public function create($table, $data) {
        try {
            // Ajouter created_at si la table le permet
            if (!isset($data['created_at'])) {
                $data['created_at'] = date('Y-m-d H:i:s');
            }

            $keys = implode(',', array_keys($data));
            $values = ':' . implode(',:', array_keys($data));
            $sql = "INSERT IGNORE INTO $table ($keys) VALUES ($values)";

            $stmt = $this->pdo->prepare($sql);
            foreach ($data as $key => $value) {
                $stmt->bindValue(":$key", $value, $this->getPDOType($value));
            }

            return $stmt->execute();
        } catch (PDOException $e) {
            $this->logError("Erreur lors de l'insertion dans la table $table : " . $e->getMessage());
            return false;
        }
    }

    /**
     * Récupère des enregistrements de la table avec conditions, tri et pagination.
     *
     * @param string $table Le nom de la table.
     * @param array $conditions Conditions optionnelles sous forme de tableau associatif.
     * @param string $orderBy Optionnel. Clause ORDER BY.
     * @param int|null $limit Optionnel. Nombre maximum de résultats à récupérer.
     * @param int|null $offset Optionnel. Décalage pour la pagination.
     * @return array Un tableau d'enregistrements.
     */
    public function read($table, $conditions = [], $orderBy = '', $limit = null, $offset = null) {
        try {
            $sql = "SELECT * FROM $table";

            if (!empty($conditions)) {
                $sql .= " WHERE ";
                $whereClauses = [];
                foreach ($conditions as $field => $value) {
                    $whereClauses[] = "$field = :$field";
                }
                $sql .= implode(' AND ', $whereClauses);
            }

            if (!empty($orderBy)) {
                $sql .= " ORDER BY $orderBy";
            }

            if ($limit !== null && $offset !== null) {
                $sql .= " LIMIT :limit OFFSET :offset";
            }

            $stmt = $this->pdo->prepare($sql);
            foreach ($conditions as $field => $value) {
                $stmt->bindValue(":$field", $value, $this->getPDOType($value));
            }
            if ($limit !== null && $offset !== null) {
                $stmt->bindValue(":limit", (int)$limit, PDO::PARAM_INT);
                $stmt->bindValue(":offset", (int)$offset, PDO::PARAM_INT);
            }

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->logError("Erreur lors de la lecture des données de la table $table : " . $e->getMessage());
            return [];
        }
    }

    /**
     * Met à jour des enregistrements dans la table en fonction des conditions.
     *
     * @param string $table Le nom de la table.
     * @param array $data Les données à mettre à jour.
     * @param array $conditions Les conditions de mise à jour.
     * @return bool True en cas de succès, False en cas d'échec.
     */
    public function update($table, $data, $conditions) {
        try {
            // Ajouter updated_at si la table le permet
            if (!isset($data['updated_at'])) {
                $data['updated_at'] = date('Y-m-d H:i:s');
            }

            $setClauses = [];
            foreach ($data as $field => $value) {
                $setClauses[] = "$field = :$field";
            }
            $sql = "UPDATE $table SET " . implode(', ', $setClauses) . " WHERE ";

            $whereClauses = [];
            foreach ($conditions as $field => $value) {
                $whereClauses[] = "$field = :where_$field";
            }
            $sql .= implode(' AND ', $whereClauses);

            $stmt = $this->pdo->prepare($sql);
            foreach ($data as $field => $value) {
                $stmt->bindValue(":$field", $value, $this->getPDOType($value));
            }
            foreach ($conditions as $field => $value) {
                $stmt->bindValue(":where_$field", $value, $this->getPDOType($value));
            }

            return $stmt->execute();
        } catch (PDOException $e) {
            $this->logError("Erreur lors de la mise à jour dans la table $table : " . $e->getMessage());
            return false;
        }
    }

    /**
     * Supprime des enregistrements en fonction des conditions spécifiées.
     *
     * @param string $table Le nom de la table.
     * @param array $conditions Les conditions pour la suppression.
     * @return bool True en cas de succès, False en cas d'échec.
     */
    public function delete($table, $conditions) {
        try {
            $sql = "DELETE FROM $table WHERE ";
            $whereClauses = [];
            foreach ($conditions as $field => $value) {
                $whereClauses[] = "$field = :$field";
            }
            $sql .= implode(' AND ', $whereClauses);

            $stmt = $this->pdo->prepare($sql);
            foreach ($conditions as $field => $value) {
                $stmt->bindValue(":$field", $value, $this->getPDOType($value));
            }

            return $stmt->execute();
        } catch (PDOException $e) {
            $this->logError("Erreur lors de la suppression dans la table $table : " . $e->getMessage());
            return false;
        }
    }

    /**
     * Exécute une requête SQL personnalisée.
     *
     * @param string $query La requête SQL.
     * @param array $params Les paramètres de la requête.
     * @return mixed Le résultat de la requête (tableau ou nombre de lignes affectées).
     */
    public function executeCustomQuery($query, $params = []) {
        try {
            $stmt = $this->pdo->prepare($query);
            foreach ($params as $param => $value) {
                $stmt->bindValue($param, $value, $this->getPDOType($value));
            }

            $stmt->execute();

            if (strpos(strtoupper($query), 'SELECT') === 0) {
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            return $stmt->rowCount();
        } catch (PDOException $e) {
            $this->logError("Erreur lors de l'exécution de la requête personnalisée : " . $e->getMessage());
            return false;
        }
    }

    /**
     * Démarre une transaction.
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }

    /**
     * Valide une transaction.
     */
    public function commit() {
        return $this->pdo->commit();
    }

    /**
     * Annule une transaction.
     */
    public function rollback() {
        return $this->pdo->rollBack();
    }

    /**
     * Crée le dossier de log s'il n'existe pas.
     */
    private function createLogDirectory() {
        if (!file_exists($this->logDirectory)) {
            mkdir($this->logDirectory, 0777, true);
        }
    }

    /**
     * Enregistre une erreur dans le fichier de log du jour.
     *
     * @param string $message Le message d'erreur.
     */
    public function logError($message) {
        $logFile = $this->logDirectory . 'log_' . date('Y-m-d') . '.log';
        error_log("[" . date('Y-m-d H:i:s') . "] " . $message . "\n", 3, $logFile);
    }

    /**
     * Détecte le type de données pour PDO.
     *
     * @param mixed $value La valeur à évaluer.
     * @return int Le type de PDO correspondant.
     */
    private function getPDOType($value) {
        if (is_int($value)) {
            return PDO::PARAM_INT;
        } elseif (is_bool($value)) {
            return PDO::PARAM_BOOL;
        } elseif (is_null($value)) {
            return PDO::PARAM_NULL;
        } else {
            return PDO::PARAM_STR;
        }
    }
    public function lastInsertId() {
        try {
            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            $this->logError("Erreur lors de la récupération du dernier ID inséré : " . $e->getMessage());
            return false;
        }
    }
}
