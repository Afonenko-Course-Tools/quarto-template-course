# Ограничение диапазона

Требуются JDK 25 или новее и Gradle с поддержкой используемого JDK.

Реализуйте `Clamp.clamp(value, lower, upper)` в `Clamp.java`, сохранив сигнатуру.
Метод возвращает ближайшее к `value` число внутри `[lower, upper]`.
При `lower > upper` требуется `IllegalArgumentException`.

Скомпилировать: `gradle build`. Проект не требует загрузки библиотек.
