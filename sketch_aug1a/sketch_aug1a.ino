//Technical Tamizha
//Procreativehub.com
//Dual-Axis-Solar-Tracker

#include <Servo.h>

// Defining Servos
Servo servohori;
int servoh = 90;
int servohLimitHigh = 160;
int servohLimitLow = 20;

Servo servoverti;
int servov = 90;
int servovLimitHigh = 160;
int servovLimitLow = 20;

// Assigning LDRs
int ldrtopl = A2; // top left LDR
int ldrtopr = A3; // top right LDR
int ldrbotl = A1; // bottom left LDR
int ldrbotr = A0; // bottom right LDR

void setup()
{
  Serial.begin(9600);   // <-- Added

  servohori.attach(10);
  servohori.write(90);

  servoverti.attach(9);
  servoverti.write(90);

  delay(500);
}

void loop()
{
  servoh = servohori.read();
  servov = servoverti.read();

  // Read LDR values
  int topl = analogRead(ldrtopl);
  int topr = analogRead(ldrtopr);
  int botl = analogRead(ldrbotl);
  int botr = analogRead(ldrbotr);

  // Calculate averages
  int avgtop = (topl + topr) / 2;
  int avgbot = (botl + botr) / 2;
  int avgleft = (topl + botl) / 2;
  int avgright = (topr + botr) / 2;

  // Vertical Servo
  if (avgtop < avgbot)
  {
    servov++;
    if (servov > servovLimitHigh)
      servov = servovLimitHigh;

    servoverti.write(servov);
    delay(10);
  }
  else if (avgbot < avgtop)
  {
    servov--;
    if (servov < servovLimitLow)
      servov = servovLimitLow;

    servoverti.write(servov);
    delay(10);
  }

  // Horizontal Servo
  if (avgleft > avgright)
  {
    servoh++;
    if (servoh > servohLimitHigh)
      servoh = servohLimitHigh;

    servohori.write(servoh);
    delay(10);
  }
  else if (avgright > avgleft)
  {
    servoh--;
    if (servoh < servohLimitLow)
      servoh = servohLimitLow;

    servohori.write(servoh);
    delay(10);
  }

  // -------- JSON TELEMETRY --------
  Serial.print("{");
  Serial.print("\"topLeft\":");
  Serial.print(topl);

  Serial.print(",\"topRight\":");
  Serial.print(topr);

  Serial.print(",\"bottomLeft\":");
  Serial.print(botl);

  Serial.print(",\"bottomRight\":");
  Serial.print(botr);

  Serial.print(",\"servoX\":");
  Serial.print(servoh);

  Serial.print(",\"servoY\":");
  Serial.print(servov);

  Serial.println("}");

  delay(50);
}