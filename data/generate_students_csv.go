package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"os"
	"strconv"
)

var faculties = []string{"CNTT", "Toan-Tin", "Vat ly", "Hoa hoc", "Sinh hoc"}
var majors = []string{"Khoa hoc may tinh", "Ky thuat phan mem", "He thong thong tin", "Tri tue nhan tao", "An toan thong tin"}
var cohorts = []string{"K21", "K22", "K23", "K24"}

func main() {
	rows := flag.Int("rows", 12000, "number of student rows")
	out := flag.String("out", "data/sample_students_500.csv", "output CSV path")
	flag.Parse()

	file, err := os.Create(*out)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	header := []string{"student_code", "full_name", "email", "faculty", "major", "cohort", "status"}
	if err := writer.Write(header); err != nil {
		panic(err)
	}

	for i := 1; i <= *rows; i++ {
		code := fmt.Sprintf("22%06d", i)
		name := fmt.Sprintf("Student %04d", i)
		email := fmt.Sprintf("student%04d@example.edu.vn", i)
		faculty := faculties[(i-1)%len(faculties)]
		major := majors[(i-1)%len(majors)]
		cohort := cohorts[(i-1)%len(cohorts)]
		status := "ACTIVE"

		record := []string{code, name, email, faculty, major, cohort, status}
		if err := writer.Write(record); err != nil {
			panic(err)
		}
	}

	if err := writer.Error(); err != nil {
		panic(err)
	}

	fmt.Println("generated", strconv.Itoa(*rows), "rows at", *out)
}
