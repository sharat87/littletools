package utils

import (
	"encoding/json"
	"log"
)

func ParseJson(raw []byte) map[string]any {
	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		log.Printf("Error unmarshalling JSON: %v: %v", err, string(raw))
	}
	return data
}

func ToJson(data any) []byte {
	content, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshalling data to JSON: %v: %+v", err, data)
		return nil
	}

	return content
}
