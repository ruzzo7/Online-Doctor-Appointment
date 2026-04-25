<?php
session_start();

// assume doctor is logged in and doctor_id is stored in session
$doctor_id = $_SESSION['doctor_id'];

// database connection
$conn = mysqli_connect("localhost", "root", "", "hospital");

// check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// fetch appointments for this doctor
$sql = "SELECT * FROM appointments WHERE doctor_id = '$doctor_id'";
$result = mysqli_query($conn, $sql);
?>

<!DOCTYPE html>
<html>
<head>
    <title>View Appointments</title>
    <style>
        table {
            border-collapse: collapse;
            width: 80%;
            margin: auto;
        }
        th, td {
            border: 1px solid black;
            padding: 10px;
            text-align: center;
        }
        th {
            background-color: #ddd;
        }
    </style>
</head>
<body>

<h2 style="text-align:center;">My Appointments</h2>

<table>
    <tr>
        <th>Patient Name</th>
        <th>Date</th>
        <th>Time</th>
        <th>Status</th>
    </tr>

    <?php
    if (mysqli_num_rows($result) > 0) {
        while ($row = mysqli_fetch_assoc($result)) {
            echo "<tr>";
            echo "<td>" . $row['patient_name'] . "</td>";
            echo "<td>" . $row['date'] . "</td>";
            echo "<td>" . $row['time'] . "</td>";
            echo "<td>" . $row['status'] . "</td>";
            echo "</tr>";
        }
    } else {
        echo "<tr><td colspan='4'>No appointments found</td></tr>";
    }
    ?>

</table>

</body>
</html>